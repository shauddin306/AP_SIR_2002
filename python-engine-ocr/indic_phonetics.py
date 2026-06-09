from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate

# Common spelling variations for Muslim/Telugu names
# We map them to predictable Latin strings so ITRANS can handle them
SPELLING_MAPPINGS = [
    ("shaik", "shek"),
    ("syed", "saiyad"),
    ("khadar", "khAdar"),
    ("mastaan", "mastAn"),
    ("mastan", "mastAn"),
    ("basha", "bAshA"),
    ("vali", "valI"),
    ("hussain", "husen"),
    ("ahamed", "ahmad"),
    ("ahmed", "ahmad"),
    ("kadar", "khAdar"),
    ("syad", "saiyad"),
]

def preprocess_english_for_telugu(name: str) -> str:
    """
    Cleans up arbitrary English spellings into an ITRANS-friendly format.
    """
    cleaned = name.lower().strip()
    
    # Apply common replacements
    for bad, good in SPELLING_MAPPINGS:
        if bad in cleaned:
            cleaned = cleaned.replace(bad, good)
            
    # Some basic phonetic normalization for Indian names typed in English
    cleaned = cleaned.replace("ee", "I")
    cleaned = cleaned.replace("oo", "U")
    
    return cleaned

def generate_telugu_variants(english_name: str) -> list[str]:
    """
    Generates multiple plausible Telugu spellings for an English name.
    """
    if not english_name:
        return []
        
    variants = set()
    
    # 1. Direct ITRANS (naive)
    variants.add(transliterate(english_name.lower(), sanscript.ITRANS, sanscript.TELUGU))
    
    # 2. Preprocessed (handles common misspellings like "shaik")
    processed = preprocess_english_for_telugu(english_name)
    variants.add(transliterate(processed, sanscript.ITRANS, sanscript.TELUGU))
    
    # 3. Capitalized initial (ITRANS distinguishes case for aspirated consonants)
    # E.g., 'kh' vs 'Kh'
    capitalized = processed.capitalize()
    variants.add(transliterate(capitalized, sanscript.ITRANS, sanscript.TELUGU))
    
    return list(variants)

if __name__ == "__main__":
    # Test
    test_names = ["shaik", "mastan", "khadar", "syed"]
    for n in test_names:
        print(f"{n} -> {generate_telugu_variants(n)}")
