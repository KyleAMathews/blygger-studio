// Who publishes statistics and who keeps records, with where they cover, so
// people pick instead of typing. Pure data, shared by blyggi.com and the
// Studio extension. Ordered global first, then regional. Keys
// match PROVIDERS and REGISTRIES in the core (a test checks this).

export type Frequency = 'monthly' | 'quarterly' | 'annual';

export interface Publisher {
  name: string;
  covers: string;
  group: 'Global' | 'Economy and finance' | 'Health' | 'Work, food and people' | 'Climate and energy' | 'Other';
  url: string;
  hint: string;
}

export const PUBLISHERS: Record<string, Publisher> = {
  owid: { name: 'Our World in Data', covers: 'Global, every topic', group: 'Global', url: 'https://ourworldindata.org/charts', hint: 'Chart name and place, e.g. life-expectancy:World' },
  worldbank: { name: 'World Bank', covers: 'Global development', group: 'Global', url: 'https://data.worldbank.org/indicator', hint: 'Indicator code and country, e.g. SI.POV.DDAY:WLD' },
  un: { name: 'UN SDG database', covers: 'Global, the SDG indicators', group: 'Global', url: 'https://unstats.un.org/sdgs/dataportal', hint: 'Series code and area, as shown on the portal' },
  imf: { name: 'IMF', covers: 'Global macro and finance', group: 'Economy and finance', url: 'https://data.imf.org', hint: 'Dataset and series key, as shown on the page' },
  oecd: { name: 'OECD', covers: 'OECD members and partners', group: 'Economy and finance', url: 'https://data-explorer.oecd.org', hint: 'Dataflow and series key, as shown in the Data Explorer' },
  bis: { name: 'BIS', covers: 'Global banking and credit', group: 'Economy and finance', url: 'https://data.bis.org', hint: 'The series key shown on data.bis.org' },
  ecb: { name: 'European Central Bank', covers: 'Euro area', group: 'Economy and finance', url: 'https://data.ecb.europa.eu', hint: 'Series key, e.g. HICP.M.I10.N.000000.4D0.ANR' },
  eurostat: { name: 'Eurostat', covers: 'European Union', group: 'Economy and finance', url: 'https://ec.europa.eu/eurostat/databrowser', hint: 'Dataset code and filters, e.g. prc_hicp_manr' },
  ons: { name: 'Office for National Statistics', covers: 'United Kingdom', group: 'Economy and finance', url: 'https://www.ons.gov.uk', hint: 'Series ID and dataset, as shown on the page' },
  fred: { name: 'FRED', covers: 'United States, and some global series', group: 'Economy and finance', url: 'https://fred.stlouisfed.org', hint: 'The series ID on the page, e.g. UNRATE' },
  who: { name: 'WHO Global Health Observatory', covers: 'Global health', group: 'Health', url: 'https://www.who.int/data/gho', hint: 'Indicator code and country' },
  ilo: { name: 'ILOSTAT', covers: 'Global work and wages', group: 'Work, food and people', url: 'https://ilostat.ilo.org', hint: 'Indicator and country, as shown on the page' },
  fao: { name: 'FAOSTAT', covers: 'Global food and agriculture', group: 'Work, food and people', url: 'https://www.fao.org/faostat', hint: 'Domain, item and country' },
  unhcr: { name: 'UNHCR Refugee Data Finder', covers: 'Global displacement', group: 'Work, food and people', url: 'https://www.unhcr.org/refugee-statistics', hint: 'The figure and population, as shown on the page' },
  noaa: { name: 'NOAA Global Monitoring Lab', covers: 'Global greenhouse gases', group: 'Climate and energy', url: 'https://gml.noaa.gov/ccgg/trends/', hint: 'Data file, e.g. co2_mm_mlo' },
  copernicus: { name: 'Copernicus Climate Change Service', covers: 'Global temperature and climate', group: 'Climate and energy', url: 'https://climate.copernicus.eu', hint: 'The indicator and dataset, as shown on the page' },
  ember: { name: 'Ember', covers: 'Global electricity', group: 'Climate and energy', url: 'https://ember-energy.org/data', hint: 'The dataset, metric and country' },
  other: { name: 'Another official statistics office', covers: 'Anywhere', group: 'Other', url: 'https://unstats.un.org/home/nso_sites/', hint: 'The address of the series' },
};

export interface Registry {
  name: string;
  covers: string;
  group: 'Laws and government' | 'Companies' | 'Science and medicine' | 'Patents' | 'Courts' | 'Software' | 'Other';
  url: string;
  hint: string;
}

export const REGISTERS: Record<string, Registry> = {
  eurlex: { name: 'EUR-Lex', covers: 'European Union law', group: 'Laws and government', url: 'https://eur-lex.europa.eu', hint: 'CELEX number or procedure reference' },
  legislation_uk: { name: 'legislation.gov.uk', covers: 'United Kingdom law', group: 'Laws and government', url: 'https://www.legislation.gov.uk', hint: 'The Act or instrument, e.g. its address' },
  uk_bills: { name: 'UK Parliament bills', covers: 'United Kingdom bills', group: 'Laws and government', url: 'https://bills.parliament.uk', hint: 'The bill\'s address' },
  congress: { name: 'congress.gov', covers: 'United States federal bills', group: 'Laws and government', url: 'https://www.congress.gov', hint: 'Congress, chamber and number, e.g. 119/hr/1' },
  companies_house: { name: 'Companies House', covers: 'United Kingdom companies', group: 'Companies', url: 'https://find-and-update.company-information.service.gov.uk', hint: 'Company number' },
  sec: { name: 'SEC EDGAR', covers: 'United States public companies', group: 'Companies', url: 'https://www.sec.gov/edgar/search/', hint: 'Company CIK or the filing\'s address' },
  doi: { name: 'DOI (Crossref)', covers: 'Published research, worldwide', group: 'Science and medicine', url: 'https://search.crossref.org', hint: 'The DOI, e.g. 10.1234/abcd' },
  arxiv: { name: 'arXiv', covers: 'Preprints, worldwide', group: 'Science and medicine', url: 'https://arxiv.org', hint: 'The arXiv ID' },
  pubmed: { name: 'PubMed', covers: 'Biomedical literature, worldwide', group: 'Science and medicine', url: 'https://pubmed.ncbi.nlm.nih.gov', hint: 'The PMID' },
  who_ictrp: { name: 'WHO trials registry (ICTRP)', covers: 'Clinical trials, worldwide', group: 'Science and medicine', url: 'https://trialsearch.who.int', hint: 'The trial ID' },
  clinicaltrials: { name: 'ClinicalTrials.gov', covers: 'Clinical trials, mostly US', group: 'Science and medicine', url: 'https://clinicaltrials.gov', hint: 'The NCT number' },
  ema: { name: 'European Medicines Agency', covers: 'EU medicine approvals', group: 'Science and medicine', url: 'https://www.ema.europa.eu', hint: 'The medicine\'s page' },
  fda: { name: 'FDA', covers: 'United States drug and device approvals', group: 'Science and medicine', url: 'https://www.fda.gov', hint: 'The application number or page' },
  espacenet: { name: 'Espacenet (EPO)', covers: 'Patents, worldwide', group: 'Patents', url: 'https://worldwide.espacenet.com', hint: 'The publication number' },
  wipo: { name: 'WIPO Patentscope', covers: 'International (PCT) patents', group: 'Patents', url: 'https://patentscope.wipo.int', hint: 'The WO number' },
  uspto: { name: 'USPTO', covers: 'United States patents', group: 'Patents', url: 'https://www.uspto.gov', hint: 'The application or patent number' },
  icj: { name: 'International Court of Justice', covers: 'Cases between states', group: 'Courts', url: 'https://www.icj-cij.org', hint: 'The case\'s page' },
  curia: { name: 'Court of Justice of the EU', covers: 'European Union courts', group: 'Courts', url: 'https://curia.europa.eu', hint: 'Case number, e.g. C-123/24' },
  bailii: { name: 'BAILII', covers: 'UK and Irish courts', group: 'Courts', url: 'https://www.bailii.org', hint: 'The neutral citation or page' },
  courtlistener: { name: 'CourtListener', covers: 'United States courts', group: 'Courts', url: 'https://www.courtlistener.com', hint: 'The docket\'s address' },
  github: { name: 'GitHub', covers: 'Software releases', group: 'Software', url: 'https://github.com', hint: 'owner/repo, e.g. blygger/blygger-studio' },
  other: { name: 'Another official register', covers: 'Anywhere', group: 'Other', url: '', hint: 'The record\'s address' },
};

export interface Indicator {
  provider: string;
  /** The series as the check names it, before @date. */
  series: string;
  name: string;
  where: string;
  unit: string;
  frequency: Frequency;
  url: string;
}

export const INDICATORS: Indicator[] = [
  { provider: 'owid', series: 'life-expectancy:World', name: 'Life expectancy at birth', where: 'World', unit: 'years', frequency: 'annual', url: 'https://ourworldindata.org/grapher/life-expectancy' },
  { provider: 'owid', series: 'share-electricity-renewables:World', name: 'Share of electricity from renewables', where: 'World', unit: '%', frequency: 'annual', url: 'https://ourworldindata.org/grapher/share-electricity-renewables' },
  { provider: 'worldbank', series: 'SI.POV.DDAY:WLD', name: 'Share of people living on under $3.00 a day', where: 'World', unit: '%', frequency: 'annual', url: 'https://data.worldbank.org/indicator/SI.POV.DDAY' },
  { provider: 'noaa', series: 'co2_mm_mlo', name: 'Atmospheric CO2 at Mauna Loa', where: 'World', unit: 'ppm', frequency: 'monthly', url: 'https://gml.noaa.gov/ccgg/trends/' },
  { provider: 'ecb', series: 'HICP.M.I10.N.000000.4D0.ANR', name: 'Inflation (HICP, annual rate)', where: 'Euro area', unit: '%', frequency: 'monthly', url: 'https://data.ecb.europa.eu/data/datasets/HICP/HICP.M.I10.N.000000.4D0.ANR' },
  { provider: 'fred', series: 'UNRATE', name: 'Unemployment rate', where: 'United States', unit: '%', frequency: 'monthly', url: 'https://fred.stlouisfed.org/series/UNRATE' },
  { provider: 'fred', series: 'CPIAUCSL', name: 'Consumer prices (CPI-U index)', where: 'United States', unit: 'index', frequency: 'monthly', url: 'https://fred.stlouisfed.org/series/CPIAUCSL' },
  { provider: 'fred', series: 'BOPGSTB', name: 'Trade balance, goods and services', where: 'United States', unit: '$ million', frequency: 'monthly', url: 'https://fred.stlouisfed.org/series/BOPGSTB' },
  { provider: 'fred', series: 'LEU0254530200Q', name: 'Median weekly earnings, professional workers', where: 'United States', unit: '$', frequency: 'quarterly', url: 'https://fred.stlouisfed.org/series/LEU0254530200Q' },
];

/** <optgroup>s for a select, in the order the groups first appear. */
export function grouped<T extends { group: string }>(entries: Record<string, T>): [string, [string, T][]][] {
  const out = new Map<string, [string, T][]>();
  for (const [k, v] of Object.entries(entries)) out.set(v.group, [...(out.get(v.group) ?? []), [k, v]]);
  return [...out];
}
