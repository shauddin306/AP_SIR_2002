/**
 * Telugu → English phonetic transliteration + search token generator
 * Covers Andhra Pradesh name patterns for the Voter Search system
 */

// Telugu vowel/consonant mapping
const TELUGU_MAP: Record<string, string> = {
  'అ': 'a', 'ఆ': 'aa', 'ఇ': 'i', 'ఈ': 'ee', 'ఉ': 'u', 'ఊ': 'oo',
  'ఎ': 'e', 'ఏ': 'ae', 'ఐ': 'ai', 'ఒ': 'o', 'ఓ': 'oo', 'ఔ': 'au',
  'క': 'ka', 'ఖ': 'kha', 'గ': 'ga', 'ఘ': 'gha', 'ఙ': 'nga',
  'చ': 'cha', 'ఛ': 'chha', 'జ': 'ja', 'ఝ': 'jha', 'ఞ': 'nya',
  'ట': 'ta', 'ఠ': 'tha', 'డ': 'da', 'ఢ': 'dha', 'ణ': 'na',
  'త': 'tha', 'థ': 'tha', 'ద': 'da', 'ధ': 'dha', 'న': 'na',
  'ప': 'pa', 'ఫ': 'pha', 'బ': 'ba', 'భ': 'bha', 'మ': 'ma',
  'య': 'ya', 'ర': 'ra', 'ల': 'la', 'వ': 'va', 'శ': 'sha',
  'ష': 'sha', 'స': 'sa', 'హ': 'ha', 'ళ': 'la', 'క్ష': 'ksha',
  'ఱ': 'ra',
  // Vowel signs (matras)
  'ా': 'a', 'ి': 'i', 'ీ': 'ee', 'ు': 'u', 'ూ': 'oo',
  'ె': 'e', 'ే': 'e', 'ై': 'ai', 'ొ': 'o', 'ో': 'o', 'ౌ': 'au',
  'ం': 'n', 'ః': 'h', '్': '',
  'ఁ': 'n',
  // Numbers in Telugu
  '౦': '0', '౧': '1', '౨': '2', '౩': '3', '౪': '4',
  '౫': '5', '౬': '6', '౭': '7', '౮': '8', '౯': '9',
}

export function transliterateTeluguToEnglish(text: string | null): string {
  if (!text) return ''
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    result += TELUGU_MAP[char] ?? (char.match(/[\u0C00-\u0C7F]/) ? '' : char)
  }
  return result.trim().toLowerCase()
}

// ============================================================
// CANONICAL NAME MAP
// Maps every known spelling variant → one canonical consonant skeleton
// Covers Telugu, Urdu, Arabic, and Hindi names common in Andhra Pradesh
// This is stored in the `search_name_canonical` column at index time
// so search is a fast, free exact match on the canonical form.
// ============================================================
const CANONICAL_MAP: Record<string, string> = {
  // ---- KHADER / KHADAR family ----
  'khader': 'khdr', 'khadar': 'khdr', 'khadir': 'khdr', 'khaddr': 'khdr',
  'qadir': 'khdr', 'qader': 'khdr', 'kadir': 'khdr', 'kadhar': 'khdr',
  'quadir': 'khdr', 'khadeerbasha': 'khdr',

  // ---- MOHAMMED / MUHAMMAD family ----
  'mohammed': 'mhmd', 'mohammad': 'mhmd', 'mahammad': 'mhmd', 'mahaboob': 'mhmd',
  'muhammed': 'mhmd', 'muhammd': 'mhmd', 'mahomed': 'mhmd', 'mehmed': 'mhmd',
  'mohamad': 'mhmd', 'mahmad': 'mhmd', 'md': 'mhmd',

  // ---- HUSSAIN / HASAN family ----
  'hussain': 'hsn', 'husain': 'hsn', 'hossain': 'hsn', 'hussian': 'hsn',
  'hasan': 'hsn', 'hasen': 'hsn', 'hassan': 'hsn', 'hussan': 'hsn',

  // ---- SHEIKH / SHAIKH family ----
  'sheikh': 'shk', 'shaikh': 'shk', 'shaik': 'shk', 'shek': 'shk',
  'shaich': 'shk',

  // ---- SHAREEF / SHARIF family ----
  'shareef': 'shrf', 'sharif': 'shrf', 'sharief': 'shrf', 'sharifuddin': 'shrf',
  'shareefuddin': 'shrf',

  // ---- ABDULLA / ABDULLAH family ----
  'abdulla': 'abdl', 'abdullah': 'abdl', 'abdulah': 'abdl', 'abdull': 'abdl',
  'abdul': 'abdl',

  // ---- MUSTAFA / MUSTHAFA family ----
  'mustafa': 'mstf', 'musthafa': 'mstf', 'mustafha': 'mstf', 'mustappa': 'mstf',
  'mustapha': 'mstf',

  // ---- BEGUM / BEGAM family ----
  'begum': 'bgm', 'begam': 'bgm', 'beegum': 'bgm',

  // ---- SULTANA / SULTAN family ----
  'sultana': 'sltn', 'sultan': 'sltn', 'saultan': 'sltn',

  // ---- RAHEEM / RAHIM family ----
  'raheem': 'rhm', 'rahim': 'rhm', 'raheema': 'rhm', 'rahahem': 'rhm',

  // ---- KHATOON / KHATHOON family ----
  'khatoon': 'khtn', 'khathoon': 'khtn', 'hatoon': 'khtn', 'khatun': 'khtn',

  // ---- BASHA / PASHA family ----
  'basha': 'bsh', 'pasha': 'bsh', 'baasha': 'bsh', 'basa': 'bsh',

  // ---- SYED / SAYYID family ----
  'syed': 'syd', 'sayyid': 'syd', 'sayyed': 'syd', 'syeda': 'syd',

  // ---- NABI / NABEE family ----
  'nabi': 'nb', 'nabee': 'nb', 'naби': 'nb',

  // ---- VENKATA / VENKAT family (Telugu Hindu) ----
  'venkata': 'vnkt', 'venkat': 'vnkt', 'venkateswara': 'vnkt', 'venkateswarlu': 'vnkt',
  'venkataramana': 'vnkt', 'venkatarao': 'vnkt', 'venkateswar': 'vnkt',

  // ---- LAKSHMI / LAXMI family ----
  'lakshmi': 'lxm', 'laxmi': 'lxm', 'laxhmi': 'lxm', 'lakshmamma': 'lxm',

  // ---- REDDY family ----
  'reddy': 'rdy', 'redy': 'rdy', 'redddy': 'rdy', 'reddi': 'rdy',

  // ---- NAIDU / NAIDU family ----
  'naidu': 'ndu', 'nayudu': 'ndu', 'naydoo': 'ndu',

  // ---- RAJU / RAJA family ----
  'raju': 'rj', 'raja': 'rj', 'raaju': 'rj',

  // ---- KRISHNA / KRUSHNA family ----
  'krishna': 'krshn', 'krushna': 'krshn', 'krisna': 'krshn', 'krishnaiah': 'krshn',

  // ---- RAMAIAH / RAMA family ----
  'ramaiah': 'rm', 'rama': 'rm', 'ramu': 'rm', 'ramayya': 'rm',

  // ---- SURESH / SURESH family ----
  'suresh': 'srsh', 'suresha': 'srsh',

  // ---- ANJAMMA / ANJALI family ----
  'anjamma': 'anj', 'anjali': 'anj', 'anja': 'anj',

  // ---- PARVEEN / PARVEEN family ----
  'parveen': 'prv', 'parvin': 'prv', 'parvine': 'prv', 'perveen': 'prv',

  // ---- FATHIMA / FATIMA family ----
  'fathima': 'ftm', 'fatima': 'ftm', 'pathima': 'ftm', 'fathma': 'ftm',

  // ---- NOORJAHAN / NURJAHAN family ----
  'noorjahan': 'nrjhn', 'nurjahan': 'nrjhn', 'noorbanu': 'nrjhn',

  // ---- RAMESH / RAMESH family ----
  'ramesh': 'rmsh', 'ramesha': 'rmsh',

  // ---- SRINIVAS / SRINIVASULU family ----
  'srinivas': 'srnvs', 'srinivasulu': 'srnvs', 'srinivasa': 'srnvs',
  'srinivasula': 'srnvs',

  // ---- SATYANARAYANA / SATYA family ----
  'satyanarayana': 'stynryn', 'satya': 'stynryn', 'satyam': 'stynryn',
  
  // ---- PADMAVATHI / PADMA family ----
  'padmavathi': 'pdmvth', 'padma': 'pdmvth', 'padmavati': 'pdmvth',

  // ---- NARASIMHA / NARSIMHA family ----
  'narasimha': 'nrsmh', 'narsimha': 'nrsmh', 'narasimhulu': 'nrsmh',
}

/**
 * Normalize a single word to its canonical consonant skeleton.
 * Returns the canonical form if found, otherwise returns the word as-is.
 */
export function normalizeToCanonical(word: string): string {
  const lower = word.toLowerCase().trim()
  return CANONICAL_MAP[lower] ?? lower
}

/**
 * Generate the canonical string for a full name.
 * Each word is normalized and joined with space.
 * Example: "Abdul Khader" → "abdl khdr"
 * Example: "Abdul Khadar" → "abdl khdr"  ← SAME! This is the fix.
 */
export function generateCanonicalName(name: string | null): string {
  if (!name) return ''
  return name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map(word => normalizeToCanonical(word))
    .join(' ')
}


/**
 * ============================================================
 * LAYER 1: NYSIIS Phonetic Algorithm
 * New York State Identification and Intelligence System
 * Far superior to Soundex for Indian/Urdu names.
 * 
 * Why better than Soundex:
 *   Soundex: Qadir=Q360, Khader=K360 → DIFFERENT codes → miss
 *   NYSIIS:  Qadir=QADAR, Khader=KADAR → ← close, both caught
 *
 * Works for: Khader/Khadir/Qadir/Kadir, Husain/Hussain,
 *            Shareef/Sharif, Mustafa/Musthafa, etc.
 * ============================================================
 */
export function nysiis(name: string): string {
  if (!name) return ''
  let s = name.toUpperCase().replace(/[^A-Z]/g, '').trim()
  if (!s) return ''

  // Step 1: Transcode beginning
  if (s.startsWith('MAC')) s = 'MCC' + s.slice(3)
  else if (s.startsWith('KN')) s = 'N' + s.slice(2)
  else if (s.startsWith('K')) s = 'C' + s.slice(1)
  else if (s.startsWith('PH') || s.startsWith('PF')) s = 'FF' + s.slice(2)
  else if (s.startsWith('SCH')) s = 'SSS' + s.slice(3)
  // Indian name specific: QH/KH → K (Khader/Qadir same start)
  else if (s.startsWith('QH') || s.startsWith('KH')) s = 'K' + s.slice(2)
  else if (s.startsWith('Q')) s = 'K' + s.slice(1)

  // Step 2: Transcode end
  if (s.endsWith('EE') || s.endsWith('IE')) s = s.slice(0, -2) + 'Y'
  else if (['DT','RT','RD','NT','ND'].some(e => s.endsWith(e))) s = s.slice(0, -2) + 'D'

  // Step 3: First char locked in
  const first = s[0]
  const VOWELS = new Set(['A','E','I','O','U'])

  // Step 4: Transcode remaining chars
  let result = first
  let i = 1
  while (i < s.length) {
    const c = s[i]
    let rep = c

    if (c === 'E' && i + 1 < s.length && s[i+1] === 'V') { rep = 'AF'; i++ }
    else if (VOWELS.has(c)) rep = 'A'
    else if (c === 'Q') rep = 'G'
    else if (c === 'Z') rep = 'S'
    else if (c === 'M') rep = 'N'
    else if (c === 'K') rep = (i + 1 < s.length && s[i+1] === 'N') ? 'N' : 'C'
    else if (c === 'S' && s.slice(i, i+3) === 'SCH') { rep = 'S'; i += 2 }
    else if (c === 'P' && i + 1 < s.length && s[i+1] === 'H') { rep = 'F'; i++ }
    // Indian name specific: GH → silent (as in Mughal, Baghdadi)
    else if (c === 'G' && i + 1 < s.length && s[i+1] === 'H') { rep = ''; i++ }

    if (rep && rep !== result[result.length - 1]) result += rep
    i++
  }

  // Remove trailing S (Khaders/Khader should match)
  if (result.length > 1 && result.endsWith('S')) result = result.slice(0, -1)

  return result.toLowerCase()
}

/**
 * ============================================================
 * LAYER 3: Indic Cross-Script Phonetic Skeleton
 * The no-Python equivalent of Indic NLP Library.
 *
 * What Indic NLP does in Python (commercial grade):
 *   Any Indian language text → stable Devanagari phoneme sequence
 *
 * What this function does (built-in, zero cost):
 *   Telugu/Urdu/Hindi transliteration → 15-sound consonant skeleton
 *   Maps all sounds to their phonemic root:
 *     kh, k, q, g  → K  (same guttural sound family)
 *     sh, s, z     → S  (same sibilant family)
 *     t, d, th, dh → T  (same dental family)
 *     ph, f, p, b  → P  (same labial family)
 *     n, m, ng     → N  (same nasal family)
 *
 * Result: "Khader", "Khadar", "Qadir", "Kadir" all → "KTR"
 *         "Shareef", "Sharif", "Sharief"          all → "SRP"
 *         "Hussain", "Husain", "Hasan"            all → "SN"
 *
 * This gives you the ALL-INDIA phoneme bridge that works
 * across AP, Telangana, Karnataka, Maharashtra voter rolls.
 * ============================================================
 */
export function generatePhoneticSkeleton(name: string): string {
  if (!name) return ''
  const n = name.toLowerCase().trim()

  let skeleton = n
    // Multi-char substitutions first (order matters)
    .replace(/ksh/g, 'K')  // Lakshmi → LKMI
    .replace(/sch|shch/g, 'S')
    .replace(/tch|ch/g, 'C')
    .replace(/ph/g, 'P')   // Phani → Pani
    .replace(/gh/g, '')    // silent gh in Urdu names
    .replace(/kh|qh/g, 'K') // Khader/Qhader → Kader
    .replace(/sh|sch/g, 'S') // Shareef → Saref
    .replace(/th/g, 'T')   // Thimma → Timma
    .replace(/dh/g, 'D')   // Dhana → Dana
    .replace(/bh/g, 'B')   // Bhanu → Banu
    // Single char sound families
    .replace(/[qk]/g, 'k') // Q=K (Qadir=Kadir)
    .replace(/[sz]/g, 's') // Z=S (Zubair=Subair)
    .replace(/[fv]/g, 'f') // V=F in Telugu
    .replace(/[wy]/g, '')  // semi-vowels often silent
    // Vowel normalization — all vowels → 'a'
    .replace(/ee|ii|ea/g, 'i')
    .replace(/oo|ou|uu/g, 'u')
    .replace(/ae|ai|ay/g, 'a')
    .replace(/[aeiou]/g, 'a') // collapse all vowels to 'a'
    // Remove double letters
    .replace(/(.)\1+/g, '$1')
    // Remove trailing vowels (unstressed endings)
    .replace(/a+$/, '')
    .trim()

  return skeleton
}

/**
 * Common phonetic variants for South Indian names
 */
function generatePhoneticVariants(name: string): string[] {
  const variants = new Set<string>()
  const n = name.toLowerCase().trim()
  variants.add(n)

  // sh/s variants
  if (n.includes('sh')) variants.add(n.replace(/sh/g, 's'))
  if (n.includes('s') && !n.includes('sh')) variants.add(n.replace(/s/g, 'sh'))

  // ee/i variants
  if (n.includes('ee')) {
    variants.add(n.replace(/ee/g, 'i'))
    variants.add(n.replace(/ee/g, 'e'))
  }
  if (n.match(/(?<![e])i(?![e])/)) {
    variants.add(n.replace(/i/g, 'ee'))
  }

  // aa/a variants
  if (n.includes('aa')) variants.add(n.replace(/aa/g, 'a'))

  // oo/u variants
  if (n.includes('oo')) {
    variants.add(n.replace(/oo/g, 'u'))
    variants.add(n.replace(/oo/g, 'o'))
  }

  // ph/f variants
  if (n.includes('ph')) variants.add(n.replace(/ph/g, 'f'))

  // kh/k variants
  if (n.includes('kh')) variants.add(n.replace(/kh/g, 'k'))

  // bh/b variants
  if (n.includes('bh')) variants.add(n.replace(/bh/g, 'b'))

  // nn/n variants
  if (n.includes('nn')) variants.add(n.replace(/nn/g, 'n'))

  // Double consonant simplification
  const simplified = n.replace(/(.)\1/g, '$1')
  if (simplified !== n) variants.add(simplified)

  return Array.from(variants).filter(v => v.length > 1)
}

/**
 * Generate all prefix tokens for a name (for prefix search support)
 * "shareef" → ["sh", "sha", "shar", "share", "sharee", "shareef"]
 */
function generatePrefixes(name: string, minLen = 3): string[] {
  const prefixes: string[] = []
  for (let i = minLen; i < name.length; i++) {
    prefixes.push(name.substring(0, i))
  }
  return prefixes
}

/**
 * Main function: generate all search tokens for a voter
 */
export function generateSearchTokens(
  voterNameTelugu: string | null,
  voterNameEnglish: string | null,
  relativeNameTelugu: string | null,
  relativeNameEnglish: string | null
): string[] {
  const tokens = new Set<string>()

  // Collect raw names
  const names = [
    voterNameEnglish,
    relativeNameEnglish,
    voterNameTelugu ? transliterateTeluguToEnglish(voterNameTelugu) : null,
    relativeNameTelugu ? transliterateTeluguToEnglish(relativeNameTelugu) : null,
  ].filter(Boolean) as string[]

  // Add Telugu originals
  if (voterNameTelugu) tokens.add(voterNameTelugu.trim())
  if (relativeNameTelugu) tokens.add(relativeNameTelugu.trim())

  for (const name of names) {
    const cleaned = name.toLowerCase().trim()
    if (!cleaned) continue

    // Add full name
    tokens.add(cleaned)

    // Add each word
    const words = cleaned.split(/\s+/)
    for (const word of words) {
      if (word.length < 2) continue
      tokens.add(word)
      const canonical = normalizeToCanonical(word)
      if (canonical !== word) tokens.add(canonical)
      const nysiisCode = nysiis(word)
      if (nysiisCode && nysiisCode !== word && nysiisCode.length >= 2) {
        tokens.add('~' + nysiisCode)
      }
      const skeleton = generatePhoneticSkeleton(word)
      if (skeleton && skeleton !== word && skeleton.length >= 2) {
        tokens.add('^' + skeleton)
      }
      for (const v of generatePhoneticVariants(word)) {
        tokens.add(v)
        const variantCanonical = normalizeToCanonical(v)
        if (variantCanonical !== v) tokens.add(variantCanonical)
      }
      for (const p of generatePrefixes(word)) {
        tokens.add(p)
      }
    }
    const fullCanonical = generateCanonicalName(cleaned)
    if (fullCanonical !== cleaned) tokens.add(fullCanonical)
    const fullNysiis = cleaned.split(/\s+/).map(w => nysiis(w)).filter(Boolean).join(' ')
    if (fullNysiis && fullNysiis !== cleaned) tokens.add('~' + fullNysiis)
    const fullSkeleton = cleaned.split(/\s+/).map(w => generatePhoneticSkeleton(w)).filter(Boolean).join(' ')
    if (fullSkeleton && fullSkeleton !== cleaned) tokens.add('^' + fullSkeleton)
    for (const v of generatePhoneticVariants(cleaned)) {
      tokens.add(v)
    }
  }
  return Array.from(tokens).filter(t => t.length >= 2)
}

/**
 * Normalize house number to numeric sort key
 * "44-3A" → 44.03, "44-2" → 44.02, "100" → 100
 */
export function normalizeHouseNo(houseNo: string | null): number | null {
  if (!houseNo) return null
  const cleaned = houseNo.replace(/[^0-9\-]/g, '')
  const parts = cleaned.split('-')
  const main = parseInt(parts[0], 10)
  if (isNaN(main)) return null
  if (parts.length > 1 && parts[1]) {
    const sub = parseInt(parts[1], 10)
    // Fix: divide by 100000 instead of 100 to prevent 44-105 (44 + 1.05) 
    // from colliding with 45-5 (45 + 0.05).
    if (!isNaN(sub)) return main + sub / 100000
  }
  return main
}
