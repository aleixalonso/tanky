const DATASET_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

export type FetchLike = (
  input: string,
  init?: {
    headers?: Record<string, string>;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export interface SpanishStationRecord {
  "C.P.": string;
  Dirección: string;
  Horario: string;
  Latitud: string;
  Localidad: string;
  "Longitud (WGS84)": string;
  Margen: string;
  Municipio: string;
  Provincia: string;
  Remisión: string;
  Rótulo: string;
  "Precio Biodiesel": string;
  "Precio Bioetanol": string;
  "Precio Gas Natural Comprimido": string;
  "Precio Gas Natural Licuado": string;
  "Precio Gases licuados del petróleo": string;
  "Precio Gasoleo A": string;
  "Precio Gasoleo B": string;
  "Precio Gasoleo Premium": string;
  "Precio Gasolina 95 E10": string;
  "Precio Gasolina 95 E5": string;
  "Precio Gasolina 95 E5 Premium": string;
  "Precio Gasolina 98 E10": string;
  "Precio Gasolina 98 E5": string;
  IDEESS: string;
  IDMunicipio: string;
  IDProvincia: string;
  IDCCAA: string;
}

export interface DatasetResponse {
  Fecha: string;
  ListaEESSPrecio: SpanishStationRecord[];
  Nota: string;
  ResultadoConsulta: string;
}

export interface SpainFuelApiClient {
  getStations(): Promise<DatasetResponse>;
}

export class HttpSpainFuelApiClient implements SpainFuelApiClient {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  async getStations(): Promise<DatasetResponse> {
    const response = await this.fetchImpl(DATASET_URL, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Spanish fuel dataset: ${response.status}`,
      );
    }

    return (await response.json()) as DatasetResponse;
  }
}
