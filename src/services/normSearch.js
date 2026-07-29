/**
 * normSearch.js — v2
 * 
 * Three sources: VIAF (AutoSuggest + justlinks), GND (lobid), Wikidata (MediaWiki API)
 * 
 * Search strategy:
 *   1. Full name
 *   2. Variant: remove dashes ("Hans-Georg" → "Hans Georg")
 *   3. Variant: last name only
 * Results are deduplicated by source+id, then scored against context hints
 * (event year → person must be alive; places → loose country match).
 */

// ─── Name variant generator ───────────────────────────────────────────────────

export function buildNameVariants(name) {
  const variants = [name];
  // Remove dashes between name parts: "Hans-Georg" → "Hans Georg"
  const noDash = name.replace(/-/g, ' ');
  if (noDash !== name) variants.push(noDash);
  // Last name only — take last token after splitting on space/comma
  const parts = name.replace(/,/g, '').trim().split(/\s+/);
  if (parts.length > 1) {
    const lastName = parts[parts.length - 1];
    if (lastName.length > 2) variants.push(lastName);
    // Also "Lastname, Firstname" format for GND
    const firstNames = parts.slice(0, -1).join(' ');
    variants.push(`${lastName}, ${firstNames}`);
  }
  // Deduplicate while preserving order
  return [...new Set(variants)];
}

// ─── Scoring engine ───────────────────────────────────────────────────────────
// context: { eventYear?: number, placeHints?: string[] }

function computeNameBonus(query, resultName) {
  if (!query || !resultName) return 0;

  // Extract surname from raw (pre-normalization) text
  const extractSurname = raw => {
    const comma = raw.indexOf(',');
    if (comma >= 0) return raw.slice(0, comma).trim().toLowerCase();
    const tokens = raw.trim().split(/\s+/);
    return tokens[tokens.length - 1].toLowerCase();
  };

  const qSurname = extractSurname(query);
  const rSurname = extractSurname(resultName);
  if (!qSurname || !rSurname || qSurname !== rSurname) return 0;

  // Normalize and tokenize for given-name comparison
  const normalize = s => s.toLowerCase().replace(/[,.\-]/g, ' ').replace(/\s+/g, ' ').trim();
  const qTokens = normalize(query).split(/\s+/).filter(Boolean);
  const rTokens = normalize(resultName).split(/\s+/).filter(Boolean);

  const qGiven = qTokens.filter(t => t !== qSurname);
  const rGiven = rTokens.filter(t => t !== rSurname);

  const isInitial = t => /^[a-zßäöü]\.?$/i.test(t) || /^[a-zßäöü][a-zßäöü]\.?$/i.test(t);

  const expandToken = t => {
    // Split combined initials like "js" → ["j", "s"], "jsb" → ["j", "s", "b"]
    if (t.length >= 2 && /^[a-zßäöü]{2,5}$/i.test(t) && !isInitial(t)) {
      return t.split('');
    }
    return [t];
  };

  const matchesToken = (short, full) => short === full || full.startsWith(short) || short.startsWith(full);
  const matchesAnyExpanded = (token, list) =>
    list.some(t => expandToken(t).some(op => matchesToken(token, op)));
  const matchesAllParts = (given, otherGiven) =>
    given.every(t => expandToken(t).some(part => matchesAnyExpanded(part, otherGiven)));

  // All name parts must be implied on both sides for full bonus
  const allImplied = qGiven.length > 0 && rGiven.length > 0
    && matchesAllParts(qGiven, rGiven)
    && matchesAllParts(rGiven, qGiven);

  return allImplied ? 25 : 10;
}

export function scoreResult(result, context, isComposer = false, preferredJobs = [], query = '') {
  const breakdown = { base: 50, date: 0, place: 0, jobBonus: 0, nameBonus: 0 };
  let score = 50;
  const { eventYear, placeHints = [] } = context || {};

  const birthYear = result.birth ? parseInt(result.birth, 10) : null;
  const deathYear = result.death ? parseInt(result.death, 10) : null;

  // ── Date scoring ──────────────────────────────────────────────────────────
  if (eventYear && birthYear) {
    const age = eventYear - birthYear;

    if (isComposer) {
      if (age < 0) {
        breakdown.date -= 60;
      } else if (age < 10) {
        breakdown.date -= 30;
      }
    } else {
      if (age < 0) {
        breakdown.date -= 60;
      } else if (age < 10) {
        breakdown.date -= 30;
      } else if (age < 100) {
        breakdown.date += 20;
        if (age >= 15 && age <= 80) breakdown.date += 10;
      } else {
        breakdown.date -= 10;
      }
      if (deathYear && deathYear < eventYear) {
        breakdown.date -= 50;
      }
    }
  } else if (eventYear && !birthYear && !isComposer) {
    breakdown.date -= 5;
  }

  score += breakdown.date;

  // ── Place scoring ─────────────────────────────────────────────────────────
  if (!isComposer && placeHints.length > 0) {
    const allPlaces = [
      result.birthPlace,
      result.deathPlace,
      result.citizenship,
      ...(result.occupations || []),
    ]
      .filter(Boolean)
      .map(s => s.toLowerCase());

    const hintsLower = placeHints.map(p => p.toLowerCase());

    for (const hint of hintsLower) {
      for (const place of allPlaces) {
        if (place.includes(hint) || hint.includes(place)) {
          breakdown.place += 15;
          break;
        }
        const countryFragments = extractCountryFragments(hint);
        if (countryFragments.some(f => place.includes(f))) {
          breakdown.place += 8;
          break;
        }
      }
    }
  }

  score += breakdown.place;

  // ── Job bonus (preferred occupations) ─────────────────────────────────────
  if (preferredJobs.length > 0 && result.occupations?.length) {
    const match = result.occupations.some(o =>
      preferredJobs.some(pj => o.toLowerCase() === pj.toLowerCase())
    );
    if (match) { breakdown.jobBonus = 10; score += 10; }
  }

  // ── Name variant bonus ────────────────────────────────────────────────────
  breakdown.nameBonus = computeNameBonus(query, result.name);
  score += breakdown.nameBonus;

  // 100 only reachable with job bonus
  const cap = breakdown.jobBonus > 0 ? 100 : 90;
  const total = Math.max(0, Math.min(cap, score));

  return { total, breakdown };
}

function extractCountryFragments(place) {
  // Map known city/region names to country fragments for loose matching
  const map = {
    'leipzig': ['deutsch', 'german', 'ddr', 'sachsen'],
    'berlin': ['deutsch', 'german', 'ddr'],
    'dresden': ['deutsch', 'german', 'ddr', 'sachsen'],
    'münchen': ['deutsch', 'german', 'bayern', 'bavar'],
    'wien': ['österreich', 'austri'],
    'zürich': ['schweiz', 'swiss'],
    'paris': ['frankreich', 'france', 'french'],
    'london': ['england', 'britain', 'uk', 'british'],
    'prag': ['tschech', 'czech', 'böhm'],
    'budapest': ['ungarn', 'hungar'],
    'moskau': ['russland', 'russia', 'soviet', 'sowjet'],
    'warschau': ['polen', 'poland', 'polish'],
    'rom': ['italien', 'italy', 'italian'],
  };
  for (const [city, frags] of Object.entries(map)) {
    if (place.includes(city)) return frags;
  }
  return [];
}

// ─── VIAF search ──────────────────────────────────────────────────────────────

async function searchVIAF(query) {
  // AutoSuggest returns JSON directly — best for browser use, no CORS issues
  const url = `https://www.viaf.org/viaf/AutoSuggest?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) throw new Error(`VIAF HTTP ${res.status}`);
  const data = await res.json();

  const results = (data.result || [])
    .filter(r => r.nametype === 'personal' || !r.nametype)
    .slice(0, 8);

  // Fetch full cluster data for each hit to get birth/death/links
  const detailed = await Promise.allSettled(
    results.map(r => fetchVIAFCluster(r.viafid, r))
  );

  return detailed
    .filter(d => d.status === 'fulfilled' && d.value)
    .map(d => d.value);
}

async function fetchVIAFCluster(viafid, suggestItem) {
  try {
    // justlinks.json gives us the cross-links to GND, LC, DNB, etc.
    const linksUrl = `https://www.viaf.org/viaf/${viafid}/justlinks.json`;
    const linksRes = await fetch(linksUrl);
    let links = {};
    if (linksRes.ok) links = await linksRes.json();

    // Parse dates from the "term" string: "Bach, Johann Sebastian, 1685-1750"
    const term  = suggestItem.term || '';
    const dateMatch = term.match(/,?\s*(\d{4})\s*[-–]\s*(\d{4})?/);
    const birth = dateMatch?.[1] ?? null;
    const death = dateMatch?.[2] ?? null;

    // Build cross-source links
    const gndId  = suggestItem.dnb  ? suggestItem.dnb  : (links.DNB?.[0]  ?? null);
    const lcId   = suggestItem.lc   ? suggestItem.lc   : (links.LC?.[0]   ?? null);
    const bnfId  = suggestItem.bnf  ? suggestItem.bnf  : (links.BNF?.[0]  ?? null);
    const wdId   = links.WKP?.[0] ?? null; // Wikidata

    return {
      source:    'VIAF',
      id:        String(viafid),
      name:      cleanVIAFName(term),
      birth,
      death,
      occupations:  [],
      birthPlace:   null,
      deathPlace:   null,
      citizenship:  null,
      gender:       null,
      description:  null,
      variantNames: [],
      viafId:    String(viafid),
      gndLink:   gndId   ? String(gndId)  : null,
      lcLink:    lcId    ? String(lcId)   : null,
      bnfLink:   bnfId   ? String(bnfId)  : null,
      wikidataLink: wdId ? String(wdId)   : null,
      url:       `https://viaf.org/viaf/${viafid}`,
      raw:       { suggestItem, links },
    };
  } catch (_) {
    return null;
  }
}

function cleanVIAFName(term) {
  // "Bach, Johann Sebastian, 1685-1750" → "Bach, Johann Sebastian"
  return term.replace(/,?\s*\d{4}\s*[-–]?\s*\d{0,4}\s*$/, '').trim();
}

// ─── GND via lobid.org ────────────────────────────────────────────────────────

async function searchGNDQuery(query) {
  // Use Lucene syntax: search preferredName and variantName, filter Person
  const q = encodeURIComponent(query);
  const url = `https://lobid.org/gnd/search?q=${q}&filter=type:Person&format=json&size=8`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GND HTTP ${res.status}`);
  const data = await res.json();

  return (data.member || []).map(item => {
    const gndId = item.gndIdentifier ?? (item.id || '').split('/').pop() ?? '';

    const birth = item.dateOfBirth?.[0] ?? null;
    const death = item.dateOfDeath?.[0] ?? null;

    const occupations = (item.professionOrOccupation || [])
      .map(o => (typeof o === 'string' ? o : o.label))
      .filter(Boolean)
      .slice(0, 4);

    const birthPlace = (item.placeOfBirth || [])
      .map(p => (typeof p === 'string' ? p : p.label))
      .filter(Boolean)[0] ?? null;

    const deathPlace = (item.placeOfDeath || [])
      .map(p => (typeof p === 'string' ? p : p.label))
      .filter(Boolean)[0] ?? null;

    const citizenship = (item.associatedCountry || [])
      .map(c => (typeof c === 'string' ? c : c.label))
      .filter(Boolean)[0] ?? null;

    const gender = item.gender?.[0]?.label ?? null;
    const variantNames = (item.variantName || []).slice(0, 5);

    // sameAs cross-links
    const sameAs = (item.sameAs || []);
    const viafLink = sameAs.find(s => (s.id || s).includes('viaf.org'));
    const wdLink   = sameAs.find(s => (s.id || s).includes('wikidata.org'));

    return {
      source:      'GND',
      id:          gndId,
      name:        item.preferredName ?? query,
      birth:       birth  ? String(birth).slice(0, 4)  : null,
      death:       death  ? String(death).slice(0, 4)  : null,
      occupations,
      birthPlace,
      deathPlace,
      citizenship,
      gender,
      variantNames,
      description: (item.biographicalOrHistoricalInformation || []).join(' ').slice(0, 300) || null,
      viafId:      viafLink ? (viafLink.id || viafLink).match(/viaf\.org\/viaf\/(\d+)/)?.[1] ?? null : null,
      gndLink:     null,
      wikidataLink: wdLink ? (wdLink.id || wdLink).match(/Q\d+/)?.[0] ?? null : null,
      url:         `https://d-nb.info/gnd/${gndId}`,
      raw:         item,
    };
  });
}

// ─── Wikidata ─────────────────────────────────────────────────────────────────

async function searchWikidataQuery(query) {
  // Step 1: text search
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=de&type=item&limit=10&format=json&origin=*`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`Wikidata search HTTP ${searchRes.status}`);
  const searchData = await searchRes.json();

  const hits = (searchData.search || []).slice(0, 8);
  if (!hits.length) return [];

  // Step 2: batch entity details
  const ids = hits.map(h => h.id).join('|');
  const detailUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&languages=de|en&props=labels|descriptions|claims&format=json&origin=*`;
  const detailRes = await fetch(detailUrl);
  if (!detailRes.ok) throw new Error(`Wikidata detail HTTP ${detailRes.status}`);
  const detailData = await detailRes.json();

  const results = [];

  for (const hit of hits) {
    const entity = detailData.entities?.[hit.id];
    if (!entity) continue;

    const claims = entity.claims || {};

    // P31 instance of → must include Q5 (human)
    const instanceOf = (claims.P31 || []).map(s => s.mainsnak?.datavalue?.value?.id);
    if (!instanceOf.includes('Q5')) continue;

    const label = entity.labels?.de?.value || entity.labels?.en?.value || hit.label || hit.id;
    const desc  = entity.descriptions?.de?.value || entity.descriptions?.en?.value || null;

    const birth = extractWDYear(claims.P569?.[0]);
    const death = extractWDYear(claims.P570?.[0]);

    const occupationIds  = (claims.P106 || []).map(s => s.mainsnak?.datavalue?.value?.id).filter(Boolean);
    const birthPlaceId   = claims.P19?.[0]?.mainsnak?.datavalue?.value?.id ?? null;
    const deathPlaceId   = claims.P20?.[0]?.mainsnak?.datavalue?.value?.id ?? null;
    const citizenshipId  = claims.P27?.[0]?.mainsnak?.datavalue?.value?.id ?? null;

    const genderId = claims.P21?.[0]?.mainsnak?.datavalue?.value?.id ?? null;
    const genderMap = { Q6581097: 'männlich', Q6581072: 'weiblich', Q1097630: 'intersexuell', Q48270: 'nicht-binär' };

    // P214 = VIAF ID, P227 = GND ID
    const viafId  = claims.P214?.[0]?.mainsnak?.datavalue?.value ?? null;
    const gndLink = claims.P227?.[0]?.mainsnak?.datavalue?.value ?? null;

    results.push({
      source:      'Wikidata',
      id:          hit.id,
      name:        label,
      birth,
      death,
      description: desc,
      occupations: [],
      occupationIds,
      birthPlaceId,
      deathPlaceId,
      citizenshipId,
      gender:      genderMap[genderId] ?? null,
      viafId,
      gndLink,
      wikidataLink: null,
      url:         `https://www.wikidata.org/wiki/${hit.id}`,
      raw:         entity,
    });
  }

  // Step 3: resolve all QIDs to labels in one batch
  const toResolve = [
    ...results.flatMap(r => r.occupationIds),
    ...results.map(r => r.birthPlaceId).filter(Boolean),
    ...results.map(r => r.deathPlaceId).filter(Boolean),
    ...results.map(r => r.citizenshipId).filter(Boolean),
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  if (toResolve.length) {
    try {
      // WD allows max 50 IDs per request — chunk if needed
      const chunks = [];
      for (let i = 0; i < toResolve.length; i += 50) chunks.push(toResolve.slice(i, i + 50));
      const labelMap = {};
      for (const chunk of chunks) {
        const lUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${chunk.join('|')}&languages=de|en&props=labels&format=json&origin=*`;
        const lRes = await fetch(lUrl);
        const lData = await lRes.json();
        for (const [id, ent] of Object.entries(lData.entities || {})) {
          labelMap[id] = ent.labels?.de?.value || ent.labels?.en?.value || id;
        }
      }
      results.forEach(r => {
        r.occupations = r.occupationIds.map(id => labelMap[id] || id).slice(0, 4);
        r.birthPlace  = r.birthPlaceId  ? (labelMap[r.birthPlaceId]  ?? null) : null;
        r.deathPlace  = r.deathPlaceId  ? (labelMap[r.deathPlaceId]  ?? null) : null;
        r.citizenship = r.citizenshipId ? (labelMap[r.citizenshipId] ?? null) : null;
      });
    } catch (_) { /* best-effort */ }
  }

  return results;
}

function extractWDYear(claim) {
  if (!claim) return null;
  const t = claim.mainsnak?.datavalue?.value?.time;
  if (!t) return null;
  // "+1888-01-00T00:00:00Z" → "1888"
  const m = t.match(/[+-](\d{4})/);
  return m ? m[1] : null;
}

// ─── Deduplication ────────────────────────────────────────────────────────────
// If GND and VIAF reference each other, merge into one richer record.

function deduplicateResults(allResults) {
  const seen = new Map();
  const out  = [];

  function findMergeTarget(idField, source, idVal) {
    if (!idVal) return null;
    return out.find(x => {
      if (x?.source === source) return false;
      const crossId = x[idField];
      return crossId && String(crossId) === String(idVal);
    });
  }

  for (const r of allResults) {
    const key = `${r.source}:${r.id}`;
    if (seen.has(key)) continue;
    seen.set(key, true);

    // VIAF → GND merge
    if (r.source === 'VIAF' && r.gndLink) {
      const gndKey = `GND:${r.gndLink}`;
      if (seen.has(gndKey)) {
        const gndRecord = out.find(x => x.source === 'GND' && x.id === r.gndLink);
        if (gndRecord) {
          if (!gndRecord.viafId && r.id) gndRecord.viafId = r.id;
          if (!gndRecord.wikidataLink && r.wikidataLink) gndRecord.wikidataLink = r.wikidataLink;
        }
        continue;
      }
    }

    // GND ↔ Wikidata cross-merge
    if (r.source === 'GND' && r.wikidataLink) {
      const merged = findMergeTarget('id', 'Wikidata', r.wikidataLink);
      if (merged) {
        // Wikidata record already in output — merge into it (prefer GND data)
        Object.assign(merged, {
          source: 'GND',
          id: r.id,
          gndLink: r.id,
          wikidataLink: merged.wikidataLink || r.wikidataLink,
          birth:     merged.birth     || r.birth,
          death:     merged.death     || r.death,
          occupations:   r.occupations?.length ? r.occupations : merged.occupations,
          birthPlace:    r.birthPlace    || merged.birthPlace,
          deathPlace:    r.deathPlace    || merged.deathPlace,
          citizenship:   r.citizenship   || merged.citizenship,
          gender:        r.gender        || merged.gender,
          variantNames:  r.variantNames?.length ? r.variantNames : merged.variantNames,
          description:   r.description   || merged.description,
          viafId:        merged.viafId   || r.viafId,
          url:           r.url,
          raw:           r.raw,
        });
        continue;
      }
    }

    if (r.source === 'Wikidata' && r.gndLink) {
      const merged = findMergeTarget('wikidataLink', 'GND', r.id);
      if (merged) {
        // GND record already in output — merge Wikidata ID into it
        if (!merged.wikidataLink) merged.wikidataLink = r.id;
        if (!merged.viafId && r.viafId) merged.viafId = r.viafId;
        if (!merged.description && r.description) merged.description = r.description;
        continue;
      }
    }

    out.push(r);
  }
  return out;
}

// ─── Multi-query with variants ────────────────────────────────────────────────

async function searchWithVariants(searchFn, name, maxVariants = 2) {
  const variants = buildNameVariants(name).slice(0, maxVariants);
  const seenIds  = new Set();
  const results  = [];

  for (const variant of variants) {
    try {
      const hits = await searchFn(variant);
      for (const h of hits) {
        const key = `${h.source}:${h.id}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          results.push(h);
        }
      }
    } catch (_) { /* variant failure is non-fatal */ }
  }
  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * @param {string} name - Person name to search
 * @param {object} context - { eventYear?: number, placeHints?: string[] }
 */
export async function searchNormdaten(name, context = {}, isComposer = false, preferredJobs = []) {
  const [gndRes, wdRes] = await Promise.allSettled([
    searchWithVariants(searchGNDQuery,        name, 3),
    searchWithVariants(searchWikidataQuery,   name, 2),
  ]);

  const gnd      = gndRes.status  === 'fulfilled' ? gndRes.value      : [];
  const wikidata = wdRes.status   === 'fulfilled' ? wdRes.value       : [];

  // Merge and deduplicate
  const all = deduplicateResults([...gnd, ...wikidata]);

  // Score each result (pass name for name variant bonus)
  const scored = all.map(r => {
    const { total, breakdown } = scoreResult(r, context, isComposer, preferredJobs, name);
    return { ...r, score: total, scoreBreakdown: breakdown };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return {
    results:       scored,
    gnd:           gnd,
    viaf:          [],
    wikidata:      wikidata,
    viafError:     null,
    gndError:      gndRes.status  === 'rejected' ? gndRes.reason.message   : null,
    wikidataError: wdRes.status   === 'rejected' ? wdRes.reason.message    : null,
  };
}
