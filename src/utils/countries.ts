export interface CountryData {
  name: string;
  isoA3: string;
  aliases: string[];
}

// A comprehensive dictionary mapping countries to their 3-letter ISO codes and common aliases
export const countriesDatabase: CountryData[] = [
  { name: "Afghanistan", isoA3: "AFG", aliases: ["afghanistan"] },
  { name: "Albania", isoA3: "ALB", aliases: ["albania"] },
  { name: "Algeria", isoA3: "DZA", aliases: ["algeria"] },
  { name: "Andorra", isoA3: "AND", aliases: ["andorra"] },
  { name: "Angola", isoA3: "AGO", aliases: ["angola"] },
  { name: "Antigua and Barbuda", isoA3: "ATG", aliases: ["antigua and barbuda", "antigua", "barbuda"] },
  { name: "Argentina", isoA3: "ARG", aliases: ["argentina"] },
  { name: "Armenia", isoA3: "ARM", aliases: ["armenia"] },
  { name: "Australia", isoA3: "AUS", aliases: ["australia", "oz"] },
  { name: "Austria", isoA3: "AUT", aliases: ["austria"] },
  { name: "Azerbaijan", isoA3: "AZE", aliases: ["azerbaijan"] },
  { name: "Bahamas", isoA3: "BHS", aliases: ["bahamas", "the bahamas"] },
  { name: "Bahrain", isoA3: "BHR", aliases: ["bahrain"] },
  { name: "Bangladesh", isoA3: "BGD", aliases: ["bangladesh"] },
  { name: "Barbados", isoA3: "BRB", aliases: ["barbados"] },
  { name: "Belarus", isoA3: "BLR", aliases: ["belarus"] },
  { name: "Belgium", isoA3: "BEL", aliases: ["belgium"] },
  { name: "Belize", isoA3: "BLZ", aliases: ["belize"] },
  { name: "Benin", isoA3: "BEN", aliases: ["benin"] },
  { name: "Bhutan", isoA3: "BTN", aliases: ["bhutan"] },
  { name: "Bolivia", isoA3: "BOL", aliases: ["bolivia"] },
  { name: "Bosnia and Herzegovina", isoA3: "BIH", aliases: ["bosnia and herzegovina", "bosnia", "herzegovina"] },
  { name: "Botswana", isoA3: "BWA", aliases: ["botswana"] },
  { name: "Brazil", isoA3: "BRA", aliases: ["brazil", "brasil"] },
  { name: "Brunei", isoA3: "BRN", aliases: ["brunei", "brunei darussalam"] },
  { name: "Bulgaria", isoA3: "BGR", aliases: ["bulgaria"] },
  { name: "Burkina Faso", isoA3: "BFA", aliases: ["burkina faso", "burkina"] },
  { name: "Burundi", isoA3: "BDI", aliases: ["burundi"] },
  { name: "Cambodia", isoA3: "KHM", aliases: ["cambodia"] },
  { name: "Cameroon", isoA3: "CMR", aliases: ["cameroon"] },
  { name: "Canada", isoA3: "CAN", aliases: ["canada", "can"] },
  { name: "Cape Verde", isoA3: "CPV", aliases: ["cape verde", "cabo verde"] },
  { name: "Central African Republic", isoA3: "CAF", aliases: ["central african republic", "car"] },
  { name: "Chad", isoA3: "TCD", aliases: ["chad"] },
  { name: "Chile", isoA3: "CHL", aliases: ["chile"] },
  { name: "China", isoA3: "CHN", aliases: ["china", "peoples republic of china", "prc"] },
  { name: "Colombia", isoA3: "COL", aliases: ["colombia"] },
  { name: "Comoros", isoA3: "COM", aliases: ["comoros"] },
  { name: "Republic of the Congo", isoA3: "COG", aliases: ["congo", "republic of the congo", "congo-brazzaville"] },
  { name: "Democratic Republic of the Congo", isoA3: "COD", aliases: ["democratic republic of the congo", "drc", "congo-kinshasa"] },
  { name: "Costa Rica", isoA3: "CRI", aliases: ["costa rica"] },
  { name: "Croatia", isoA3: "HRV", aliases: ["croatia"] },
  { name: "Cuba", isoA3: "CUB", aliases: ["cuba"] },
  { name: "Cyprus", isoA3: "CYP", aliases: ["cyprus"] },
  { name: "Czech Republic", isoA3: "CZE", aliases: ["czech republic", "czechia", "czech"] },
  { name: "Denmark", isoA3: "DNK", aliases: ["denmark"] },
  { name: "Djibouti", isoA3: "DJI", aliases: ["djibouti"] },
  { name: "Dominica", isoA3: "DMA", aliases: ["dominica"] },
  { name: "Dominican Republic", isoA3: "DOM", aliases: ["dominican republic"] },
  { name: "East Timor", isoA3: "TLS", aliases: ["east timor", "timor-leste", "timor leste"] },
  { name: "Ecuador", isoA3: "ECU", aliases: ["ecuador"] },
  { name: "Egypt", isoA3: "EGY", aliases: ["egypt"] },
  { name: "El Salvador", isoA3: "SLV", aliases: ["el salvador"] },
  { name: "Equatorial Guinea", isoA3: "GNQ", aliases: ["equatorial guinea"] },
  { name: "Eritrea", isoA3: "ERI", aliases: ["eritrea"] },
  { name: "Estonia", isoA3: "EST", aliases: ["estonia"] },
  { name: "Eswatini", isoA3: "SWZ", aliases: ["eswatini", "swaziland"] },
  { name: "Ethiopia", isoA3: "ETH", aliases: ["ethiopia"] },
  { name: "Fiji", isoA3: "FJI", aliases: ["fiji"] },
  { name: "Finland", isoA3: "FIN", aliases: ["finland"] },
  { name: "France", isoA3: "FRA", aliases: ["france", "french"] },
  { name: "Gabon", isoA3: "GAB", aliases: ["gabon"] },
  { name: "Gambia", isoA3: "GMB", aliases: ["gambia", "the gambia"] },
  { name: "Georgia", isoA3: "GEO", aliases: ["georgia"] },
  { name: "Germany", isoA3: "DEU", aliases: ["germany", "deutschland"] },
  { name: "Ghana", isoA3: "GHA", aliases: ["ghana"] },
  { name: "Greece", isoA3: "GRC", aliases: ["greece", "hellas"] },
  { name: "Grenada", isoA3: "GRD", aliases: ["grenada"] },
  { name: "Guatemala", isoA3: "GTM", aliases: ["guatemala"] },
  { name: "Guinea", isoA3: "GIN", aliases: ["guinea"] },
  { name: "Guinea-Bissau", isoA3: "GNB", aliases: ["guinea-bissau", "guinea bissau"] },
  { name: "Guyana", isoA3: "GUY", aliases: ["guyana"] },
  { name: "Haiti", isoA3: "HTI", aliases: ["haiti"] },
  { name: "Honduras", isoA3: "HND", aliases: ["honduras"] },
  { name: "Hungary", isoA3: "HUN", aliases: ["hungary"] },
  { name: "Iceland", isoA3: "ISL", aliases: ["iceland"] },
  { name: "India", isoA3: "IND", aliases: ["india", "hindustan"] },
  { name: "Indonesia", isoA3: "IDN", aliases: ["indonesia"] },
  { name: "Iran", isoA3: "IRN", aliases: ["iran", "islamic republic of iran"] },
  { name: "Iraq", isoA3: "IRQ", aliases: ["iraq"] },
  { name: "Ireland", isoA3: "IRL", aliases: ["ireland", "republic of ireland", "eire"] },
  { name: "Israel", isoA3: "ISR", aliases: ["israel"] },
  { name: "Italy", isoA3: "ITA", aliases: ["italy", "italia"] },
  { name: "Ivory Coast", isoA3: "CIV", aliases: ["ivory coast", "cote d'ivoire", "cote divoire", "côte d'ivoire"] },
  { name: "Jamaica", isoA3: "JAM", aliases: ["jamaica"] },
  { name: "Japan", isoA3: "JPN", aliases: ["japan", "nippon"] },
  { name: "Jordan", isoA3: "JOR", aliases: ["jordan"] },
  { name: "Kazakhstan", isoA3: "KAZ", aliases: ["kazakhstan"] },
  { name: "Kenya", isoA3: "KEN", aliases: ["kenya"] },
  { name: "Kiribati", isoA3: "KIR", aliases: ["kiribati"] },
  { name: "North Korea", isoA3: "PRK", aliases: ["north korea", "dprk", "democratic peoples republic of korea"] },
  { name: "South Korea", isoA3: "KOR", aliases: ["south korea", "korea", "republic of korea"] },
  { name: "Kuwait", isoA3: "KWT", aliases: ["kuwait"] },
  { name: "Kyrgyzstan", isoA3: "KGZ", aliases: ["kyrgyzstan", "kyrgyz republic"] },
  { name: "Laos", isoA3: "LAO", aliases: ["laos", "lao peoples democratic republic"] },
  { name: "Latvia", isoA3: "LVA", aliases: ["latvia"] },
  { name: "Lebanon", isoA3: "LBN", aliases: ["lebanon"] },
  { name: "Lesotho", isoA3: "LSO", aliases: ["lesotho"] },
  { name: "Liberia", isoA3: "LBR", aliases: ["liberia"] },
  { name: "Libya", isoA3: "LBY", aliases: ["libya"] },
  { name: "Liechtenstein", isoA3: "LIE", aliases: ["liechtenstein"] },
  { name: "Lithuania", isoA3: "LTU", aliases: ["lithuania"] },
  { name: "Luxembourg", isoA3: "LUX", aliases: ["luxembourg"] },
  { name: "Madagascar", isoA3: "MDG", aliases: ["madagascar"] },
  { name: "Malawi", isoA3: "MWI", aliases: ["malawi"] },
  { name: "Malaysia", isoA3: "MYS", aliases: ["malaysia"] },
  { name: "Maldives", isoA3: "MDV", aliases: ["maldives"] },
  { name: "Mali", isoA3: "MLI", aliases: ["mali"] },
  { name: "Malta", isoA3: "MLT", aliases: ["malta"] },
  { name: "Marshall Islands", isoA3: "MHL", aliases: ["marshall islands", "marshall"] },
  { name: "Mauritania", isoA3: "MRT", aliases: ["mauritania"] },
  { name: "Mauritius", isoA3: "MUS", aliases: ["mauritius"] },
  { name: "Mexico", isoA3: "MEX", aliases: ["mexico", "mex"] },
  { name: "Micronesia", isoA3: "FSM", aliases: ["micronesia", "federated states of micronesia"] },
  { name: "Moldova", isoA3: "MDA", aliases: ["moldova"] },
  { name: "Monaco", isoA3: "MCO", aliases: ["monaco"] },
  { name: "Mongolia", isoA3: "MNG", aliases: ["mongolia"] },
  { name: "Montenegro", isoA3: "MNE", aliases: ["montenegro"] },
  { name: "Morocco", isoA3: "MAR", aliases: ["morocco"] },
  { name: "Mozambique", isoA3: "MOZ", aliases: ["mozambique"] },
  { name: "Myanmar", isoA3: "MMR", aliases: ["myanmar", "burma"] },
  { name: "Namibia", isoA3: "NAM", aliases: ["namibia"] },
  { name: "Nauru", isoA3: "NRU", aliases: ["nauru"] },
  { name: "Nepal", isoA3: "NPL", aliases: ["nepal"] },
  { name: "Netherlands", isoA3: "NLD", aliases: ["netherlands", "holland", "dutch"] },
  { name: "New Zealand", isoA3: "NZL", aliases: ["new zealand", "kiwiland"] },
  { name: "Nicaragua", isoA3: "NIC", aliases: ["nicaragua"] },
  { name: "Niger", isoA3: "NER", aliases: ["niger"] },
  { name: "Nigeria", isoA3: "NGA", aliases: ["nigeria"] },
  { name: "North Macedonia", isoA3: "MKD", aliases: ["north macedonia", "macedonia"] },
  { name: "Norway", isoA3: "NOR", aliases: ["norway"] },
  { name: "Oman", isoA3: "OMN", aliases: ["oman"] },
  { name: "Pakistan", isoA3: "PAK", aliases: ["pakistan"] },
  { name: "Palau", isoA3: "PLW", aliases: ["palau"] },
  { name: "Palestine", isoA3: "PSE", aliases: ["palestine", "gaza", "west bank"] },
  { name: "Panama", isoA3: "PAN", aliases: ["panama"] },
  { name: "Papua New Guinea", isoA3: "PNG", aliases: ["papua new guinea", "png"] },
  { name: "Paraguay", isoA3: "PRY", aliases: ["paraguay"] },
  { name: "Peru", isoA3: "PER", aliases: ["peru"] },
  { name: "Philippines", isoA3: "PHL", aliases: ["philippines", "philipines"] },
  { name: "Poland", isoA3: "POL", aliases: ["poland"] },
  { name: "Portugal", isoA3: "PRT", aliases: ["portugal"] },
  { name: "Qatar", isoA3: "QAT", aliases: ["qatar"] },
  { name: "Romania", isoA3: "ROU", aliases: ["romania"] },
  { name: "Russia", isoA3: "RUS", aliases: ["russia", "russian federation", "ussr"] },
  { name: "Rwanda", isoA3: "RWA", aliases: ["rwanda"] },
  { name: "Saint Kitts and Nevis", isoA3: "KNA", aliases: ["saint kitts and nevis", "st kitts"] },
  { name: "Saint Lucia", isoA3: "LCA", aliases: ["saint lucia", "st lucia"] },
  { name: "Saint Vincent and the Grenadines", isoA3: "VCT", aliases: ["saint vincent and the grenadines", "st vincent"] },
  { name: "Samoa", isoA3: "WSM", aliases: ["samoa", "western samoa"] },
  { name: "San Marino", isoA3: "SMR", aliases: ["san marino"] },
  { name: "Sao Tome and Principe", isoA3: "STP", aliases: ["sao tome", "principe"] },
  { name: "Saudi Arabia", isoA3: "SAU", aliases: ["saudi arabia", "saudi"] },
  { name: "Senegal", isoA3: "SEN", aliases: ["senegal"] },
  { name: "Serbia", isoA3: "SRB", aliases: ["serbia"] },
  { name: "Seychelles", isoA3: "SYC", aliases: ["seychelles"] },
  { name: "Sierra Leone", isoA3: "SLE", aliases: ["sierra leone"] },
  { name: "Singapore", isoA3: "SGP", aliases: ["singapore"] },
  { name: "Slovakia", isoA3: "SVK", aliases: ["slovakia"] },
  { name: "Slovenia", isoA3: "SVN", aliases: ["slovenia"] },
  { name: "Solomon Islands", isoA3: "SLB", aliases: ["solomon islands", "solomon"] },
  { name: "Somalia", isoA3: "SOM", aliases: ["somalia"] },
  { name: "South Africa", isoA3: "ZAF", aliases: ["south africa", "rsa"] },
  { name: "South Sudan", isoA3: "SSD", aliases: ["south sudan"] },
  { name: "Spain", isoA3: "ESP", aliases: ["spain", "espana"] },
  { name: "Sri Lanka", isoA3: "LKA", aliases: ["sri lanka", "ceylon"] },
  { name: "Sudan", isoA3: "SDN", aliases: ["sudan"] },
  { name: "Suriname", isoA3: "SUR", aliases: ["suriname"] },
  { name: "Sweden", isoA3: "SWE", aliases: ["sweden"] },
  { name: "Switzerland", isoA3: "CHE", aliases: ["switzerland", "swiss"] },
  { name: "Syria", isoA3: "SYR", aliases: ["syria", "syrian arab republic"] },
  { name: "Taiwan", isoA3: "TWN", aliases: ["taiwan", "republic of china", "roc"] },
  { name: "Tajikistan", isoA3: "TJK", aliases: ["tajikistan"] },
  { name: "Tanzania", isoA3: "TZA", aliases: ["tanzania", "united republic of tanzania"] },
  { name: "Thailand", isoA3: "THA", aliases: ["thailand"] },
  { name: "Togo", isoA3: "TGO", aliases: ["togo"] },
  { name: "Tonga", isoA3: "TON", aliases: ["tonga"] },
  { name: "Trinidad and Tobago", isoA3: "TTO", aliases: ["trinidad and tobago", "trinidad", "tobago"] },
  { name: "Tunisia", isoA3: "TUN", aliases: ["tunisia"] },
  { name: "Turkey", isoA3: "TUR", aliases: ["turkey", "türkiye", "turkiye"] },
  { name: "Turkmenistan", isoA3: "TKM", aliases: ["turkmenistan"] },
  { name: "Tuvalu", isoA3: "TUV", aliases: ["tuvalu"] },
  { name: "Uganda", isoA3: "UGA", aliases: ["uganda"] },
  { name: "Ukraine", isoA3: "UKR", aliases: ["ukraine"] },
  { name: "United Arab Emirates", isoA3: "ARE", aliases: ["united arab emirates", "uae", "dubai", "abu dhabi"] },
  { name: "United Kingdom", isoA3: "GBR", aliases: ["united kingdom", "uk", "great britain", "britain", "england", "scotland", "wales", "northern ireland"] },
  { name: "United States of America", isoA3: "USA", aliases: ["united states of america", "united states", "usa", "us", "america", "states"] },
  { name: "Uruguay", isoA3: "URY", aliases: ["uruguay"] },
  { name: "Uzbekistan", isoA3: "UZB", aliases: ["uzbekistan"] },
  { name: "Vanuatu", isoA3: "VUT", aliases: ["vanuatu"] },
  { name: "Vatican City", isoA3: "VAT", aliases: ["vatican city", "vatican", "holy see"] },
  { name: "Venezuela", isoA3: "VEN", aliases: ["venezuela"] },
  { name: "Vietnam", isoA3: "VNM", aliases: ["vietnam", "viet nam"] },
  { name: "Western Sahara", isoA3: "ESH", aliases: ["western sahara"] },
  { name: "Yemen", isoA3: "YEM", aliases: ["yemen"] },
  { name: "Zambia", isoA3: "ZMB", aliases: ["zambia"] },
  { name: "Zimbabwe", isoA3: "ZWE", aliases: ["zimbabwe"] }
];

// Helper to normalize input for forgiving matching
export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD") // split accented characters into base character + accent
    .replace(/[\u0300-\u036f]/g, "") // remove accent characters
    .replace(/[.,'\"-]/g, " ") // replace punctuation with spaces
    .replace(/\s+/g, " ") // collapse multiple spaces to a single space
    .trim();
}

/**
 * Searches for a country by input string, checking canonical names and aliases.
 * Returns the matching CountryData or null if not found.
 */
export function findCountry(query: string): CountryData | null {
  const normalizedQuery = normalizeString(query);
  if (!normalizedQuery) return null;

  for (const country of countriesDatabase) {
    // Check canonical name
    if (normalizeString(country.name) === normalizedQuery) {
      return country;
    }
    // Check aliases
    for (const alias of country.aliases) {
      if (normalizeString(alias) === normalizedQuery) {
        return country;
      }
    }
  }

  return null;
}

// Complete 3-letter (ISO-A3) to 2-letter (ISO-A2) country code map
const isoA3ToA2: Record<string, string> = {
  AFG: "af", ALB: "al", DZA: "dz", AND: "ad", AGO: "ao", ATG: "ag", ARG: "ar", ARM: "am", AUS: "au", AUT: "at", AZE: "az", BHS: "bs", BHR: "bh", BGD: "bd", BRB: "bb", BLR: "by", BEL: "be", BLZ: "bz", BEN: "bj", BTN: "bt", BOL: "bo", BIH: "ba", BWA: "bw", BRA: "br", BRN: "bn", BGR: "bg", BFA: "bf", BDI: "bi", KHM: "kh", CMR: "cm", CAN: "ca", CPV: "cv", CAF: "cf", TCD: "td", CHL: "cl", CHN: "cn", COL: "co", COM: "km", COG: "cg", COD: "cd", CRI: "cr", HRV: "hr", CUB: "cu", CYP: "cy", CZE: "cz", DNK: "dk", DJI: "dj", DMA: "dm", DOM: "do", TLS: "tl", ECU: "ec", EGY: "eg", SLV: "sv", GNQ: "gq", ERI: "er", EST: "ee", SWZ: "sz", ETH: "et", FJI: "fj", FIN: "fi", FRA: "fr", GAB: "ga", GMB: "gm", GEO: "ge", DEU: "de", GHA: "gh", GRC: "gr", GRD: "gd", GTM: "gt", GIN: "gn", GNB: "gw", GUY: "gy", HTI: "ht", HND: "hn", HUN: "hu", ISL: "is", IND: "in", IDN: "id", IRN: "ir", IRQ: "iq", IRL: "ie", ISR: "il", ITA: "it", CIV: "ci", JAM: "jm", JPN: "jp", JOR: "jo", KAZ: "kz", KEN: "ke", KIR: "ki", PRK: "kp", KOR: "kr", KWT: "kw", KGZ: "kg", LAO: "la", LVA: "lv", LBN: "lb", LSO: "ls", LBR: "lr", LBY: "ly", LIE: "li", LTU: "lt", LUX: "lu", MDG: "mg", MWI: "mw", MYS: "my", MDV: "mv", MLI: "ml", MLT: "mt", MHL: "mh", MRT: "mr", MUS: "mu", MEX: "mx", FSM: "fm", MDA: "md", MCO: "mc", MNG: "mn", MNE: "me", MAR: "ma", MOZ: "mz", MMR: "mm", NAM: "na", NRU: "nr", NPL: "np", NLD: "nl", NZL: "nz", NIC: "ni", NER: "ne", NGA: "ng", MKD: "mk", NOR: "no", OMN: "om", PAK: "pk", PLW: "pw", PSE: "ps", PAN: "pa", PNG: "pg", PRY: "py", PER: "pe", PHL: "ph", POL: "pl", PRT: "pt", QAT: "qa", ROU: "ro", RUS: "ru", RWA: "rw", KNA: "kn", LCA: "lc", VCT: "vc", WSM: "ws", SMR: "sm", STP: "st", SAU: "sa", SEN: "sn", SRB: "rs", SYC: "sc", SLE: "sl", SGP: "sg", SVK: "sk", SVN: "si", SLB: "sb", SOM: "so", ZAF: "za", SSD: "ss", ESP: "es", LKA: "lk", SDN: "sd", SUR: "sr", SWE: "se", CHE: "ch", SYR: "sy", TWN: "tw", TJK: "tj", TZA: "tz", THA: "th", TGO: "tg", TON: "to", TTO: "tt", TUN: "tn", TUR: "tr", TKM: "tm", TUV: "tv", UGA: "ug", UKR: "ua", ARE: "ae", GBR: "gb", USA: "us", URY: "uy", UZB: "uz", VUT: "vu", VAT: "va", VEN: "ve", VNM: "vn", ESH: "eh", YEM: "ye", ZMB: "zm", ZWE: "zw"
};

/**
 * Returns the flag CDN image URL for a given 3-letter country ISO code.
 */
export function getCountryFlagUrl(isoA3: string): string | null {
  const code2 = isoA3ToA2[isoA3.toUpperCase()];
  if (!code2) return null;
  return `https://flagcdn.com/w256/${code2.toLowerCase()}.png`;
}

