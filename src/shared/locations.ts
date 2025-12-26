export interface BairroInfo {
  nome: string;
}

export interface Municipio {
  nome: string;
  bairros: BairroInfo[];
}

export interface Provincia {
  nome: string;
  municipios: Municipio[];
}

// Lista de províncias, municípios e bairros principais de Angola (DPA 2025)
export const PROVINCIAS: Provincia[] = [
  {
    nome: "Luanda",
    municipios: [
      {
        nome: "Luanda",
        bairros: [
          { nome: "Ingombota" },
          { nome: "Maianga" },
          { nome: "Rangel" },
          { nome: "Samba" },
          { nome: "Sambizanga" },
          { nome: "Marçal" },
          { nome: "Maculusso" },
          { nome: "Kinaxixe" },
          { nome: "Mutamba" },
          { nome: "Prenda" },
        ],
      },
      {
        nome: "Belas",
        bairros: [
          { nome: "Benfica" },
          { nome: "Futungo" },
          { nome: "Morro Bento" },
          { nome: "Ramiros" },
        ],
      },
      {
        nome: "Cacuaco",
        bairros: [
          { nome: "Centro" },
          { nome: "Kikolo" },
          { nome: "Funda" },
          { nome: "Mulenvos" },
        ],
      },
      {
        nome: "Cazenga",
        bairros: [
          { nome: "Centro" },
          { nome: "Hoji ya Henda" },
          { nome: "Tala Hady" },
          { nome: "11 de Novembro" },
        ],
      },
      {
        nome: "Kilamba Kiaxi",
        bairros: [
          { nome: "Centro" },
          { nome: "Palanca" },
          { nome: "Golf" },
          { nome: "Sapú" },
        ],
      },
      {
        nome: "Talatona",
        bairros: [
          { nome: "Centro" },
          { nome: "Camama" },
          { nome: "Lar Patriota" },
          { nome: "Kilamba" },
        ],
      },
      {
        nome: "Viana",
        bairros: [
          { nome: "Centro" },
          { nome: "Zango 1" },
          { nome: "Zango 2" },
          { nome: "Zango 3" },
          { nome: "Zango 4" },
          { nome: "Zango 5" },
          { nome: "Estalagem" },
          { nome: "Kikuxi" },
          { nome: "Baia" },
        ],
      },
      {
        nome: "Mussulo",
        bairros: [
          { nome: "Centro" },
          { nome: "Pontas" },
        ],
      },
    ],
  },
  {
    nome: "Bengo",
    municipios: [
      { nome: "Ambriz", bairros: [{ nome: "Centro" }] },
      { nome: "Dande", bairros: [{ nome: "Caxito" }] },
      { nome: "Dembos", bairros: [{ nome: "Centro" }] },
      { nome: "Nambuangongo", bairros: [{ nome: "Centro" }] },
      { nome: "Pango Aluquém", bairros: [{ nome: "Centro" }] },
      { nome: "Bula Atumba", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Benguela",
    municipios: [
      {
        nome: "Benguela",
        bairros: [
          { nome: "Cavaco" },
          { nome: "Lobito" },
          { nome: "Catumbela" },
          { nome: "Praia Morena" },
        ],
      },
      { nome: "Lobito", bairros: [{ nome: "Restinga" }, { nome: "Compão" }, { nome: "Egipto Praia" }] },
      { nome: "Baía Farta", bairros: [{ nome: "Centro" }] },
      { nome: "Cubal", bairros: [{ nome: "Centro" }] },
      { nome: "Ganda", bairros: [{ nome: "Centro" }] },
      { nome: "Chongorói", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Huambo",
    municipios: [
      {
        nome: "Huambo",
        bairros: [
          { nome: "Centralidade" },
          { nome: "São Pedro" },
          { nome: "Comandante Cowboy" },
        ],
      },
      { nome: "Caála", bairros: [{ nome: "Centro" }] },
      { nome: "Ecunha", bairros: [{ nome: "Centro" }] },
      { nome: "Londuimbali", bairros: [{ nome: "Centro" }] },
      { nome: "Longonjo", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Huíla",
    municipios: [
      {
        nome: "Lubango",
        bairros: [
          { nome: "Lage" },
          { nome: "Santo António" },
          { nome: "Mapunda" },
        ],
      },
      { nome: "Chibia", bairros: [{ nome: "Centro" }] },
      { nome: "Humpata", bairros: [{ nome: "Centro" }] },
      { nome: "Quipungo", bairros: [{ nome: "Centro" }] },
      { nome: "Matala", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Cabinda",
    municipios: [
      { nome: "Cabinda", bairros: [{ nome: "Centro" }] },
      { nome: "Cacongo", bairros: [{ nome: "Lândana" }] },
      { nome: "Buco-Zau", bairros: [{ nome: "Centro" }] },
      { nome: "Belize", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Cuanza Norte",
    municipios: [
      { nome: "Ndalatando", bairros: [{ nome: "Centro" }] },
      { nome: "Cambambe", bairros: [{ nome: "Dondo" }] },
      { nome: "Golungo Alto", bairros: [{ nome: "Centro" }] },
      { nome: "Ambaca", bairros: [{ nome: "Centro" }] },
      { nome: "Lucala", bairros: [{ nome: "Centro" }] },
      { nome: "Banga", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Cuanza Sul",
    municipios: [
      { nome: "Sumbe", bairros: [{ nome: "Centro" }] },
      { nome: "Porto Amboim", bairros: [{ nome: "Centro" }] },
      { nome: "Amboim", bairros: [{ nome: "Gabela" }] },
      { nome: "Quibala", bairros: [{ nome: "Centro" }] },
      { nome: "Waku Kungo", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Bié",
    municipios: [
      { nome: "Kuito", bairros: [{ nome: "Centro" }] },
      { nome: "Camacupa", bairros: [{ nome: "Centro" }] },
      { nome: "Andulo", bairros: [{ nome: "Centro" }] },
      { nome: "Nharea", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Malanje",
    municipios: [
      { nome: "Malanje", bairros: [{ nome: "Centro" }] },
      { nome: "Cacuso", bairros: [{ nome: "Centro" }] },
      { nome: "Calandula", bairros: [{ nome: "Centro" }] },
      { nome: "Cangandala", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Uíge",
    municipios: [
      { nome: "Uíge", bairros: [{ nome: "Centro" }] },
      { nome: "Negage", bairros: [{ nome: "Centro" }] },
      { nome: "Maquela do Zombo", bairros: [{ nome: "Centro" }] },
      { nome: "Songo", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Zaire",
    municipios: [
      { nome: "M'Banza Kongo", bairros: [{ nome: "Centro" }] },
      { nome: "Soyo", bairros: [{ nome: "Centro" }] },
      { nome: "Cuimba", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Lunda Norte",
    municipios: [
      { nome: "Dundo", bairros: [{ nome: "Centro" }] },
      { nome: "Cambulo", bairros: [{ nome: "Centro" }] },
      { nome: "Lucapa", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Lunda Sul",
    municipios: [
      { nome: "Saurimo", bairros: [{ nome: "Centro" }] },
      { nome: "Muconda", bairros: [{ nome: "Centro" }] },
      { nome: "Dala", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Moxico",
    municipios: [
      { nome: "Luena", bairros: [{ nome: "Centro" }] },
      { nome: "Cameia", bairros: [{ nome: "Lumeje" }] },
      { nome: "Cazombo", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Namibe",
    municipios: [
      { nome: "Moçâmedes", bairros: [{ nome: "Centro" }] },
      { nome: "Tômbwa", bairros: [{ nome: "Centro" }] },
      { nome: "Bibala", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Cunene",
    municipios: [
      { nome: "Ondjiva", bairros: [{ nome: "Centro" }] },
      { nome: "Cuanhama", bairros: [{ nome: "Centro" }] },
      { nome: "Ombadja", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Cuando Cubango",
    municipios: [
      { nome: "Menongue", bairros: [{ nome: "Centro" }] },
      { nome: "Cuito Cuanavale", bairros: [{ nome: "Centro" }] },
      { nome: "Dirico", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Kuando Norte",
    municipios: [
      { nome: "Lumbala N'Guimbo", bairros: [{ nome: "Centro" }] },
    ],
  },
  {
    nome: "Icolo e Bengo",
    municipios: [
      { nome: "Catete", bairros: [{ nome: "Centro" }] },
      { nome: "Bom Jesus", bairros: [{ nome: "Centro" }] },
      { nome: "Calumbo", bairros: [{ nome: "Centro" }] },
    ],
  },
];
