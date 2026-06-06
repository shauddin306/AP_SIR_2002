from indic_transliteration import sanscript
from indic_transliteration.sanscript import transliterate

text = "mustak"
telugu_text = transliterate(text, sanscript.ITRANS, sanscript.TELUGU)
print(f"ITRANS: {telugu_text}")

text2 = "mastaan"
telugu_text2 = transliterate(text2, sanscript.ITRANS, sanscript.TELUGU)
print(f"ITRANS: {telugu_text2}")
