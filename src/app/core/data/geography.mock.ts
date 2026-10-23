
import { Department } from '../models/catalog.models';

export const GEOGRAPHY_MOCK: Department[] = [
  {
    ubigeo: '15',
    nombre: 'Lima',
    provincias: [
      {
        ubigeo: '1501',
        nombre: 'Lima',
        distritos: [
          {
            ubigeo: '1501-SUR',
            nombre_mostrado: 'Villa El Salvador (Zona Sur)',
            nombre_oficial: 'Villa El Salvador',
            id_zona: 1,
            lat: -12.2138,
            lng: -76.9375,
          },
          {
            ubigeo: '1501-NORTE',
            nombre_mostrado: 'Los Olivos (Zona Norte)',
            nombre_oficial: 'Los Olivos',
            id_zona: 2,
            lat: -11.976,
            lng: -77.072,
          },
          {
            ubigeo: '1501-ESTE',
            nombre_mostrado: 'Ate (Zona Este)',
            nombre_oficial: 'Ate',
            id_zona: 3,
            lat: -12.026,
            lng: -76.919,
          },
          {
            ubigeo: '1501-OESTE',
            nombre_mostrado: 'San Miguel (Zona Oeste)',
            nombre_oficial: 'San Miguel',
            id_zona: 4,
            lat: -12.077,
            lng: -77.09,
          },
          {
            ubigeo: '1501-CENTRO',
            nombre_mostrado: 'Cercado de Lima (Zona Centro)',
            nombre_oficial: 'Lima',
            id_zona: 5,
            lat: -12.0464,
            lng: -77.0428,
          },
        ],
      },
    ],
  },
];
