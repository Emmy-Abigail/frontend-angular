import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as L from 'leaflet';

import { AuthService } from '../../core/services/auth';
import { OperadorService, RegistroPaqueteRequest, DireccionSugerencia } from '../../core/services/operador.service';
import { CatalogService } from '../../core/services/catalog.service';
import { Department, District } from '../../core/models/catalog.models';
import { GEOGRAPHY_MOCK } from '../../core/data/geography.mock';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-operador',
  styleUrl: './operador.css',
  templateUrl: './operador.html',
})
export class Operador implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private operadorService = inject(OperadorService);
  private catalogService = inject(CatalogService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  currentUser = this.authService.currentUser;

  // Catálogo de distritos
  departamentos: Department[] = GEOGRAPHY_MOCK;

  get todosLosDistritos(): District[] {
    return this.departamentos.flatMap((departamento) =>
      departamento.provincias.flatMap((provincia) => provincia.distritos),
    );
  }

  get idZonaDeMiSede(): number {
    const sedeNombre = (this.currentUser()?.sede?.nombre || '').toLowerCase();
    if (sedeNombre.includes('norte')) return 1;
    if (sedeNombre.includes('centro')) return 2;
    if (sedeNombre.includes('sur')) return 3;
    if (sedeNombre.includes('este')) return 4;
    if (sedeNombre.includes('oeste') || sedeNombre.includes('callao')) return 5;
    return 1;
  }

  get distritosDeMiSede(): District[] {
    const zonaId = this.idZonaDeMiSede;
    return this.todosLosDistritos.filter((d) => d.id_zona === zonaId);
  }

  get otrosDistritos(): District[] {
    const zonaId = this.idZonaDeMiSede;
    return this.todosLosDistritos.filter((d) => d.id_zona !== zonaId);
  }

  get nombreDistritoSeleccionado(): string {
    const distrito = this.todosLosDistritos.find(
      (item) => item.ubigeo === this.direccion.distrito,
    );

    return distrito?.nombre_mostrado ?? '';
  }

  // Estado de las validaciones y del servidor
  enviado = false;
  guardando = false;
  mensajeError = '';
  erroresServidor: Record<string, string> = {};
  camposTocados = new Set<string>();

  // Geocodificación y búsqueda asistida de direcciones (backend /geocode/suggest y /geocode/reverse)
  busquedaDireccion = '';
  sugerenciasDireccion: DireccionSugerencia[] = [];
  buscandoDirecciones = false;
  geocodificandoPunto = false;
  correoInfo = '';
  private debounceBusqueda: any = null;

  // Mapa interactivo Leaflet
  punto: { lat: number; lng: number } | null = null;
  private mapa?: L.Map;
  private marcador?: L.Marker;

  ngOnInit(): void {
    this.catalogService.getGeography().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.departamentos = data;
        }
      },
      error: () => {
        // Mantiene GEOGRAPHY_MOCK si no responde la red
      },
    });
  }

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      const contenedor = document.getElementById('mapa-entrega');
      if (contenedor) {
        this.mapa = L.map('mapa-entrega').setView([-12.0464, -77.0428], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
        }).addTo(this.mapa);

        this.mapa.on('click', (e: L.LeafletMouseEvent) => {
          this.actualizarPuntoEnMapa(e.latlng.lat, e.latlng.lng);

          if (!this.marcador) {
            this.marcador = L.marker(e.latlng, {
              draggable: true,
              icon: L.icon({
                iconUrl: 'assets/marker-icon.png',
                iconRetinaUrl: 'assets/marker-icon-2x.png',
                shadowUrl: 'assets/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
              }),
            }).addTo(this.mapa!);

            this.marcador.on('dragend', () => {
              const p = this.marcador!.getLatLng();
              this.actualizarPuntoEnMapa(p.lat, p.lng);
            });
          } else {
            this.marcador.setLatLng(e.latlng);
          }
        });
      }
    }
  }

  moverMarcadorYCentrar(lat: number, lng: number, zoom = 17): void {
    this.punto = { lat, lng };
    if (this.mapa) {
      this.mapa.setView([lat, lng], zoom);
      if (!this.marcador) {
        this.marcador = L.marker([lat, lng], {
          draggable: true,
          icon: L.icon({
            iconUrl: 'assets/marker-icon.png',
            iconRetinaUrl: 'assets/marker-icon-2x.png',
            shadowUrl: 'assets/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
          }),
        }).addTo(this.mapa);

        this.marcador.on('dragend', () => {
          const p = this.marcador!.getLatLng();
          this.actualizarPuntoEnMapa(p.lat, p.lng);
        });
      } else {
        this.marcador.setLatLng([lat, lng]);
      }
    }
    this.actualizarCotizacion();
    this.cdr.markForCheck();
  }

  actualizarPuntoEnMapa(lat: number, lng: number): void {
    this.punto = { lat, lng };
    this.geocodificandoPunto = true;
    this.operadorService.geocodificarInverso(lat, lng).subscribe({
      next: (res) => {
        this.geocodificandoPunto = false;
        if (res?.data) {
          const item = res.data;
          if (item.ubigeo_distrito) {
            this.direccion.distrito = item.ubigeo_distrito;
          }
          if (item.tipo_via) {
            this.direccion.tipoVia = item.tipo_via;
          }
          if (item.nombre_via) {
            this.direccion.nombreVia = item.nombre_via;
          }
          // Conservar el número que el operador ya ingresó manualmente si existe
          if (item.numero && !this.direccion.numero.trim()) {
            this.direccion.numero = item.numero;
          }
          this.actualizarCotizacion();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.geocodificandoPunto = false;
        this.cdr.markForCheck();
      },
    });
  }

  onNumeroInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.direccion.numero = input.value;
    this.marcarTocado('numero');

    if (this.direccion.nombreVia.trim().length >= 3) {
      if (this.debounceBusqueda) {
        clearTimeout(this.debounceBusqueda);
      }
      this.buscandoDirecciones = true;
      this.debounceBusqueda = setTimeout(() => {
        this.buscarSugerencias(this.direccion.nombreVia.trim(), true);
      }, 300);
    }
  }

  onNombreViaInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.direccion.nombreVia = input.value;
    this.marcarTocado('nombreVia');

    if (this.debounceBusqueda) {
      clearTimeout(this.debounceBusqueda);
    }
    const query = this.direccion.nombreVia.trim();
    if (query.length < 3) {
      this.sugerenciasDireccion = [];
      this.buscandoDirecciones = false;
      return;
    }
    this.buscandoDirecciones = true;
    this.debounceBusqueda = setTimeout(() => {
      const hasNumber = /\s+\d{1,5}[A-Za-z]?$/.test(query);
      this.buscarSugerencias(query, hasNumber);
    }, 250);
  }

  async geocodificarDireccionConNumero(
    cleanStreet: string,
    extractedNum: string,
    currentDistrict: any,
    tipoViaActual: string,
  ): Promise<DireccionSugerencia | null> {
    const num = parseInt(extractedNum, 10);
    const cleanStreetNoPrefix = cleanStreet.replace(
      /^(Carlos|Don|San|Santa|Mariscal|Coronel|General|Doctor|Dr\.|Ing\.)\s+/i,
      '',
    );
    const distName = currentDistrict.nombre_mostrado;

    // 1. Intentar búsqueda de predio o casa en Nominatim
    const queries = [
      `${cleanStreet} ${extractedNum} ${distName}`,
      `${cleanStreetNoPrefix} ${extractedNum} ${distName}`,
      `${extractedNum} ${cleanStreetNoPrefix} ${distName}`,
    ];

    for (const q of queries) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=3`;
        const res = await fetch(url, { headers: { 'User-Agent': 'AntigravityApp/1.0' } });
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          const house = items.find(
            (d) =>
              d.type === 'house' ||
              d.class === 'place' ||
              (d.address && d.address.house_number == extractedNum),
          );
          if (house) {
            const via = this.direccion.tipoVia || tipoViaActual;
            return {
              etiqueta: `${via} ${cleanStreet} ${extractedNum}, ${distName}`,
              tipo_via: via,
              nombre_via: cleanStreet,
              numero: extractedNum,
              ubigeo_distrito: currentDistrict.ubigeo,
              distrito: distName,
              lat: parseFloat(house.lat),
              lng: parseFloat(house.lon),
            };
          }
        }
      } catch {
        // continuar
      }
    }

    // 2. Si no hay nodo individual de casa, obtener geometría de la calle para interpolar la cuadra exacta
    try {
      const streetQueries = [
        `${cleanStreet} ${distName}`,
        `${cleanStreetNoPrefix} ${distName}`,
      ];

      for (const sq of streetQueries) {
        const geomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(sq)}&polygon_geojson=1&limit=8`;
        const geomRes = await fetch(geomUrl, { headers: { 'User-Agent': 'AntigravityApp/1.0' } });
        const geomItems = await geomRes.json();

        if (Array.isArray(geomItems) && geomItems.length > 0) {
          const allCoords: [number, number][] = [];
          for (const item of geomItems) {
            if (item.geojson && (item.geojson.type === 'LineString' || item.geojson.type === 'MultiLineString')) {
              const coords = item.geojson.type === 'LineString' ? item.geojson.coordinates : item.geojson.coordinates.flat();
              for (const c of coords) {
                if (Array.isArray(c) && c.length >= 2) {
                  allCoords.push([c[0], c[1]]);
                }
              }
            }
          }

          if (allCoords.length > 0) {
            const lats = allCoords.map((c) => c[1]);
            const lngs = allCoords.map((c) => c[0]);
            const latSpan = Math.max(...lats) - Math.min(...lats);
            const lngSpan = Math.max(...lngs) - Math.min(...lngs);

            if (latSpan >= lngSpan) {
              allCoords.sort((a, b) => a[1] - b[1]); // Sur a Norte
            } else {
              allCoords.sort((a, b) => a[0] - b[0]); // Oeste a Este
            }

            const cuadra = Math.floor(num / 100);
            const maxEstimatedCuadra = Math.max(6, cuadra + 1);
            const fraction = Math.min(Math.max((num - 100) / (maxEstimatedCuadra * 100 - 100), 0.05), 0.95);
            const targetIdx = Math.round(fraction * (allCoords.length - 1));
            const pt = allCoords[targetIdx];

            const via = this.direccion.tipoVia || tipoViaActual;
            return {
              etiqueta: `${via} ${cleanStreet} ${extractedNum}, ${distName}`,
              tipo_via: via,
              nombre_via: cleanStreet,
              numero: extractedNum,
              ubigeo_distrito: currentDistrict.ubigeo,
              distrito: distName,
              lat: pt[1],
              lng: pt[0],
            };
          }
        }
      }
    } catch {
      // continuar
    }

    return null;
  }

  async buscarSugerencias(query: string, autoUpdateMap = false): Promise<void> {
    const distritosCatalog = this.todosLosDistritos;
    const currentDistrict =
      distritosCatalog.find((d) => d.ubigeo === this.direccion.distrito) ||
      this.distritosDeMiSede[0] || {
        nombre_mostrado: 'San Martín de Porres',
        nombre_oficial: 'San Martín de Porres',
        ubigeo: '150135',
        lat: -12.03,
        lng: -77.0575,
        id_zona: 1,
      };

    let raw = query.trim();
    let extractedNum = this.direccion.numero ? this.direccion.numero.trim() : '';
    const numMatch = raw.match(/\s+(\d{1,5}[A-Za-z]?)$/);
    if (numMatch) {
      extractedNum = numMatch[1];
      raw = raw.slice(0, numMatch.index).trim();
      this.direccion.numero = extractedNum;
    }

    let cleanStreet = raw.replace(/^(Av\.|Avenida|Jr\.|Jirón|Calle|Psje\.|Pasaje|Carretera)\s+/i, '').trim();
    cleanStreet = cleanStreet.replace(/bacaflor/i, 'Baca Flor');

    const tipoViaActual =
      this.direccion.tipoVia ||
      (query.match(/^(Av\.|Avenida)/i)
        ? 'Av.'
        : query.match(/^(Jr\.|Jirón)/i)
          ? 'Jr.'
          : query.match(/^Calle/i)
            ? 'Calle'
            : 'Jr.');

    // Si el usuario especificó un número de casa, usar geocodificación con interpolación de cuadra
    if (extractedNum && /^\d+$/.test(extractedNum)) {
      this.buscandoDirecciones = true;
      try {
        const resultadoExacto = await this.geocodificarDireccionConNumero(
          cleanStreet,
          extractedNum,
          currentDistrict,
          tipoViaActual,
        );

        if (resultadoExacto) {
          this.sugerenciasDireccion = [resultadoExacto];
          if (autoUpdateMap) {
            this.moverMarcadorYCentrar(resultadoExacto.lat, resultadoExacto.lng, 18);
          }
          this.buscandoDirecciones = false;
          this.cdr.markForCheck();
          return;
        }
      } catch {
        // Continuar con backend y Photon
      }
    }

    const queryContextual = extractedNum
      ? `${cleanStreet} ${extractedNum} ${currentDistrict.nombre_mostrado}`
      : `${cleanStreet} ${currentDistrict.nombre_mostrado}`;

    this.operadorService.sugerirDirecciones(queryContextual).subscribe({
      next: (res) => {
        const data = res?.data || [];
        if (data.length > 0) {
          this.procesarSugerencias(data, cleanStreet, extractedNum, currentDistrict, tipoViaActual, autoUpdateMap);
        } else {
          this.fallbackPhotonSearch(cleanStreet, extractedNum, currentDistrict, tipoViaActual, autoUpdateMap);
        }
      },
      error: () => {
        this.fallbackPhotonSearch(cleanStreet, extractedNum, currentDistrict, tipoViaActual, autoUpdateMap);
      },
    });
  }

  private procesarSugerencias(
    data: DireccionSugerencia[],
    cleanStreet: string,
    extractedNum: string,
    currentDistrict: any,
    tipoViaActual: string,
    autoUpdateMap = false,
  ): void {
    const distNombre = currentDistrict.nombre_mostrado.toLowerCase();
    const distOficial = (currentDistrict.nombre_oficial || '').toLowerCase();

    let filtradas = data.filter((s) => {
      const sDist = (s.distrito || '').toLowerCase();
      return (
        s.ubigeo_distrito === currentDistrict.ubigeo ||
        sDist.includes(distNombre) ||
        distNombre.includes(sDist) ||
        (distOficial && (sDist.includes(distOficial) || distOficial.includes(sDist)))
      );
    });

    if (filtradas.length === 0) {
      this.fallbackPhotonSearch(cleanStreet, extractedNum, currentDistrict, tipoViaActual, autoUpdateMap);
      return;
    }

    this.sugerenciasDireccion = filtradas.map((s) => {
      const num = extractedNum || s.numero || null;
      const via = this.direccion.tipoVia || s.tipo_via || tipoViaActual;
      const calle = s.nombre_via || cleanStreet;
      return {
        ...s,
        etiqueta: `${via} ${calle}${num ? ' ' + num : ''}, ${currentDistrict.nombre_mostrado}`,
        tipo_via: via,
        nombre_via: calle,
        numero: num,
        ubigeo_distrito: currentDistrict.ubigeo,
        distrito: currentDistrict.nombre_mostrado,
      };
    });

    if (autoUpdateMap && this.sugerenciasDireccion.length > 0) {
      const best = this.sugerenciasDireccion[0];
      this.moverMarcadorYCentrar(best.lat, best.lng, 17);
    }

    this.buscandoDirecciones = false;
    this.cdr.markForCheck();
  }

  private fallbackPhotonSearch(
    cleanStreet: string,
    extractedNum: string,
    currentDistrict: any,
    tipoViaActual: string,
    autoUpdateMap = false,
  ): void {
    const cleanStreetNoPrefix = cleanStreet.replace(
      /^(Carlos|Don|San|Santa|Mariscal|Coronel|General|Doctor|Dr\.|Ing\.)\s+/i,
      '',
    );

    const variants: string[] = [];
    if (extractedNum) {
      variants.push(`${cleanStreet} ${extractedNum} ${currentDistrict.nombre_mostrado}`);
      if (cleanStreetNoPrefix !== cleanStreet) {
        variants.push(`${cleanStreetNoPrefix} ${extractedNum} ${currentDistrict.nombre_mostrado}`);
      }
      variants.push(`${cleanStreet} ${extractedNum}`);
      if (cleanStreetNoPrefix !== cleanStreet) {
        variants.push(`${cleanStreetNoPrefix} ${extractedNum}`);
      }
    }
    variants.push(`${cleanStreet} ${currentDistrict.nombre_mostrado}`);
    if (cleanStreetNoPrefix !== cleanStreet) {
      variants.push(`${cleanStreetNoPrefix} ${currentDistrict.nombre_mostrado}`);
    }
    variants.push(cleanStreet);

    const bbox = '-77.30,-12.60,-76.55,-11.50';
    const distNombre = currentDistrict.nombre_mostrado.toLowerCase();
    const distOficial = (currentDistrict.nombre_oficial || '').toLowerCase();

    const doFetch = (index: number) => {
      if (index >= variants.length) {
        const via = this.direccion.tipoVia || tipoViaActual;
        const num = extractedNum || this.direccion.numero || null;
        const defLat = currentDistrict.lat || -12.03;
        const defLng = currentDistrict.lng || -77.0575;
        this.sugerenciasDireccion = [
          {
            etiqueta: `${via} ${cleanStreet}${num ? ' ' + num : ''}, ${currentDistrict.nombre_mostrado}`,
            tipo_via: via,
            nombre_via: cleanStreet,
            numero: num,
            ubigeo_distrito: currentDistrict.ubigeo,
            distrito: currentDistrict.nombre_mostrado,
            lat: defLat,
            lng: defLng,
          },
        ];
        if (autoUpdateMap) {
          this.moverMarcadorYCentrar(defLat, defLng, 16);
        }
        this.buscandoDirecciones = false;
        this.cdr.markForCheck();
        return;
      }

      const q = variants[index];
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&bbox=${bbox}`;

      fetch(url)
        .then((r) => r.json())
        .then((json) => {
          const features = json.features || [];
          const matches: DireccionSugerencia[] = [];

          for (const f of features) {
            const coords = f.geometry?.coordinates;
            const props = f.properties || {};
            if (!coords) continue;

            const pDist = [
              props.district,
              props.suburb,
              props.city,
              props.county,
              props.town,
              props.state,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

            const esMismoDistrito =
              !distNombre ||
              pDist.includes(distNombre) ||
              pDist.includes(distOficial) ||
              distNombre.includes(pDist) ||
              (distOficial && distOficial.includes(pDist));

            const houseNum = props.housenumber || extractedNum || null;

            if (esMismoDistrito) {
              const via =
                this.direccion.tipoVia ||
                (props.street?.startsWith('Av')
                  ? 'Av.'
                  : props.street?.startsWith('Jr')
                    ? 'Jr.'
                    : tipoViaActual);

              matches.push({
                etiqueta: `${via} ${cleanStreet}${houseNum ? ' ' + houseNum : ''}, ${currentDistrict.nombre_mostrado}`,
                tipo_via: via,
                nombre_via: cleanStreet,
                numero: houseNum,
                ubigeo_distrito: currentDistrict.ubigeo,
                distrito: currentDistrict.nombre_mostrado,
                lat: coords[1],
                lng: coords[0],
              });
              break;
            }
          }

          if (matches.length > 0) {
            this.sugerenciasDireccion = matches;
            if (autoUpdateMap && matches[0]) {
              this.moverMarcadorYCentrar(matches[0].lat, matches[0].lng, 17);
            }
            this.buscandoDirecciones = false;
            this.cdr.markForCheck();
          } else {
            doFetch(index + 1);
          }
        })
        .catch(() => {
          doFetch(index + 1);
        });
    };

    doFetch(0);
  }

  seleccionarSugerencia(sug: DireccionSugerencia): void {
    if (sug.tipo_via) {
      this.direccion.tipoVia = sug.tipo_via;
    }
    if (sug.nombre_via) {
      this.direccion.nombreVia = sug.nombre_via;
    }
    if (sug.numero) {
      this.direccion.numero = sug.numero;
    }
    if (sug.ubigeo_distrito) {
      this.direccion.distrito = sug.ubigeo_distrito;
    }
    this.moverMarcadorYCentrar(sug.lat, sug.lng, 17);
    this.sugerenciasDireccion = [];
    this.actualizarCotizacion();
    this.cdr.markForCheck();
  }

  centrarMapaEnDistrito(): void {
    const distrito = this.todosLosDistritos.find((item) => item.ubigeo === this.direccion.distrito);
    if (distrito && distrito.lat && distrito.lng && this.mapa) {
      this.mapa.setView([distrito.lat, distrito.lng], 15);
    }
  }

  marcarTocado(campo: string): void {
    this.camposTocados.add(campo);
    if (campo === 'distrito') {
      this.centrarMapaEnDistrito();
      if (this.direccion.nombreVia.trim().length >= 3) {
        this.buscarSugerencias(this.direccion.nombreVia.trim(), true);
      }
    }
    if (['pesoReal', 'largo', 'ancho', 'alto', 'distrito'].includes(campo)) {
      this.actualizarCotizacion();
    }
  }

  // Documento del remitente
  tipoDocumentoRemitente: 'DNI' | 'RUC' = 'DNI';

  remitente = {
    documento: '',
    nombre: '',
    celular: '',
    correo: '',
  };

  destinatario = {
    nombre: '',
    dni: '',
    celular: '',
    correo: '',
  };

  // Dirección de entrega
  direccion = {
    departamento: 'Lima',
    provincia: 'Lima',
    distrito: '',
    tipoVia: '',
    nombreVia: '',
    numero: '',
    manzana: '',
    lote: '',
    referencia: '',
  };

  // Dimensiones del paquete
  paquete = {
    pesoReal: null as number | null,
    largo: null as number | null,
    ancho: null as number | null,
    alto: null as number | null,
  };

  // Valores de cotización
  tarifaBasePorKg = 2.50;
  factorZona = 1.0;
  totalEstimadoServidor: number | null = null;

  // Estado y datos de la ventana de confirmación
  modalRegistroAbierto = false;
  codigoSeguimiento = '';
  codigoCopiado = false;
  fechaIngreso = '';

  vehiculoAsignado = 'Motorizado';
  loteAsignado = 'L-101';
  zonaLote = 'Zona Sur';

  // ----------------------------------------------------
  // Restricciones de entrada (solo números, solo letras y longitud)
  // ----------------------------------------------------

  onNombreRemitenteInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    this.remitente.nombre = input.value;
  }

  onDocumentoRemitenteInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const max = this.tipoDocumentoRemitente === 'DNI' ? 8 : 11;
    input.value = input.value.replace(/\D/g, '').slice(0, max);
    this.remitente.documento = input.value;
  }

  onCelularRemitenteInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '');
    if (val.length > 0 && !val.startsWith('9')) {
      val = '';
    }
    input.value = val.slice(0, 9);
    this.remitente.celular = input.value;
  }

  onCorreoRemitenteInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.remitente.correo = input.value.trim();
  }

  onNombreDestinatarioInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    this.destinatario.nombre = input.value;
  }

  onDniDestinatarioInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 8);
    this.destinatario.dni = input.value;
  }

  onCelularDestinatarioInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '');
    if (val.length > 0 && !val.startsWith('9')) {
      val = '';
    }
    input.value = val.slice(0, 9);
    this.destinatario.celular = input.value;
  }

  onCorreoDestinatarioInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.destinatario.correo = input.value.trim();
  }

  // Cálculos de peso
  get pesoVolumetrico(): number {
    const { largo, ancho, alto } = this.paquete;

    if (largo == null || ancho == null || alto == null) {
      return 0;
    }

    return (largo * ancho * alto) / 5000;
  }

  get pesoFacturable(): number {
    return Math.max(
      this.paquete.pesoReal ?? 0,
      this.pesoVolumetrico,
    );
  }

  get totalEstimado(): number {
    if (this.totalEstimadoServidor !== null) {
      return this.totalEstimadoServidor;
    }
    return this.pesoFacturable * this.tarifaBasePorKg * this.factorZona;
  }

  actualizarCotizacion(): void {
    if (
      !this.direccion.distrito ||
      !this.pesoRealValido() ||
      !this.dimensionValida(this.paquete.largo) ||
      !this.dimensionValida(this.paquete.ancho) ||
      !this.dimensionValida(this.paquete.alto)
    ) {
      return;
    }

    this.operadorService.cotizar({
      ubigeo_destino: this.direccion.distrito,
      peso_kg: this.paquete.pesoReal!,
      largo_cm: this.paquete.largo!,
      ancho_cm: this.paquete.ancho!,
      alto_cm: this.paquete.alto!,
    }).subscribe({
      next: (res) => {
        if (res && res.monto) {
          this.totalEstimadoServidor = parseFloat(res.monto);
          if (res.tarifa_base_kg) this.tarifaBasePorKg = parseFloat(res.tarifa_base_kg);
          if (res.factor) this.factorZona = parseFloat(res.factor);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.totalEstimadoServidor = null;
        this.cdr.markForCheck();
      },
    });
  }

  // Nombres solo letras y espacios
  nombreValido(nombre: string): boolean {
    const trim = nombre.trim();
    return trim.length >= 2 && /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(trim);
  }

  // Validación del DNI o RUC del remitente
  get documentoRemitenteValido(): boolean {
    const documento = this.remitente.documento.trim();

    return this.tipoDocumentoRemitente === 'DNI'
      ? /^\d{8}$/.test(documento)
      : /^\d{11}$/.test(documento);
  }

  // Validación del DNI del destinatario
  get dniDestinatarioValido(): boolean {
    return /^\d{8}$/.test(this.destinatario.dni.trim());
  }

  // Los celulares deben tener 9 dígitos y empezar con 9
  celularValido(celular: string): boolean {
    return /^9\d{8}$/.test(celular.trim());
  }

  // Validación de correo electrónico obligatorio
  correoValido(correo: string): boolean {
    const trim = (correo || '').trim();
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trim);
  }

  // Peso real entre 0.1 y 50 kg
  pesoRealValido(): boolean {
    const peso = this.paquete.pesoReal;

    return (
      peso !== null &&
      Number.isFinite(peso) &&
      peso >= 0.1 &&
      peso <= 50
    );
  }

  // Cada dimensión debe estar entre 10 y 150 cm
  dimensionValida(valor: number | null): boolean {
    return (
      valor !== null &&
      Number.isFinite(valor) &&
      valor >= 10 &&
      valor <= 150
    );
  }

  // Resumen de errores del formulario
  get errores(): Record<string, boolean> {
    const tieneNumero = !!this.direccion.numero.trim();
    const tieneManzana = !!this.direccion.manzana.trim();
    const tieneLote = !!this.direccion.lote.trim();

    return {
      remitenteNombre: !this.nombreValido(this.remitente.nombre),
      remitenteDocumento: !this.documentoRemitenteValido,
      remitenteCelular: !this.celularValido(this.remitente.celular),
      remitenteCorreo: !this.correoValido(this.remitente.correo),

      destinatarioNombre: !this.nombreValido(this.destinatario.nombre),
      destinatarioDni: !this.dniDestinatarioValido,
      destinatarioCelular: !this.celularValido(this.destinatario.celular),
      destinatarioCorreo: !this.correoValido(this.destinatario.correo),

      distrito: !this.direccion.distrito,
      tipoVia: !this.direccion.tipoVia,
      nombreVia: !this.direccion.nombreVia.trim(),
      numero: !tieneNumero && !tieneManzana,
      manzana: !tieneNumero && !tieneManzana,
      lote: tieneManzana && !tieneLote,

      pesoReal: !this.pesoRealValido(),
      largo: !this.dimensionValida(this.paquete.largo),
      ancho: !this.dimensionValida(this.paquete.ancho),
      alto: !this.dimensionValida(this.paquete.alto),
    };
  }

  get formularioValido(): boolean {
    return !Object.values(this.errores).some(
      (tieneError) => tieneError,
    );
  }

  mostrarError(campo: string): boolean {
    if (this.erroresServidor[campo]) {
      return true;
    }
    return (
      (this.enviado || this.camposTocados.has(campo)) &&
      this.errores[campo] === true
    );
  }

  obtenerMensajeError(campo: string, defaultMsg: string): string {
    return this.erroresServidor[campo] || defaultMsg;
  }

  validarFormulario(): boolean {
    this.enviado = true;
    return this.formularioValido;
  }

  registrarPaquete(): void {
    if (!this.validarFormulario()) {
      return;
    }

    this.guardando = true;
    this.mensajeError = '';
    this.erroresServidor = {};

    const payload: RegistroPaqueteRequest = {
      remitente: {
        tipo_documento: this.tipoDocumentoRemitente,
        numero_documento: this.remitente.documento.trim(),
        nombres: this.remitente.nombre.trim(),
        celular: this.remitente.celular.trim(),
        correo: this.remitente.correo.trim(),
      },
      destinatario: {
        nombres: this.destinatario.nombre.trim(),
        dni: this.destinatario.dni.trim(),
        celular: this.destinatario.celular.trim(),
        correo: this.destinatario.correo.trim(),
      },
      direccion: {
        ubigeo_distrito: this.direccion.distrito,
        tipo_via: this.direccion.tipoVia,
        nombre_via: this.direccion.nombreVia.trim(),
        numero: this.direccion.numero.trim() || null,
        manzana: this.direccion.manzana.trim() || null,
        lote: this.direccion.lote.trim() || null,
        referencia: this.direccion.referencia.trim() || null,
        ...(this.punto ? { lat: this.punto.lat, lng: this.punto.lng } : {}),
      },
      peso_kg: this.paquete.pesoReal!,
      largo_cm: this.paquete.largo!,
      ancho_cm: this.paquete.ancho!,
      alto_cm: this.paquete.alto!,
    };

    this.operadorService.registrarPaquete(payload).subscribe({
      next: (res) => {
        this.guardando = false;
        this.codigoSeguimiento = res.tracking_id;
        this.codigoCopiado = false;
        this.fechaIngreso = res.fecha_ingreso ? new Date(res.fecha_ingreso).toLocaleString('es-PE') : new Date().toLocaleString('es-PE');
        if (res.lote) {
          this.loteAsignado = res.lote.codigo || `L-${res.lote.id}`;
          this.vehiculoAsignado = res.lote.vehiculo || 'Motorizado';
          this.zonaLote = res.lote.zona || 'Zona Sur';
        }
        if (res.cotizacion?.monto) {
          this.totalEstimadoServidor = typeof res.cotizacion.monto === 'number' ? res.cotizacion.monto : parseFloat(res.cotizacion.monto as any);
        }

        if (res.correo_enviado) {
          const { remitente, destinatario } = res.correo_enviado;
          if (remitente && destinatario) {
            this.correoInfo = 'Código de seguimiento enviado por correo al remitente y destinatario.';
          } else if (remitente) {
            this.correoInfo = 'Código de seguimiento enviado por correo al remitente.';
          } else if (destinatario) {
            this.correoInfo = 'Código de seguimiento enviado por correo al destinatario.';
          } else if (remitente === false || destinatario === false) {
            this.correoInfo = 'El paquete fue registrado, pero no se pudo enviar el correo de seguimiento.';
          } else {
            this.correoInfo = '';
          }
        } else {
          this.correoInfo = '';
        }

        this.modalRegistroAbierto = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.guardando = false;
        this.modalRegistroAbierto = false;

        if (err.status === 422 && err.error?.campos) {
          this.erroresServidor = err.error.campos;
          this.mensajeError = err.error.message || 'Por favor revisa los campos señalados.';
        } else if (err.status === 503) {
          this.mensajeError = err.error?.message || 'Servicio no disponible, reintente';
        } else if (err.status === 409) {
          this.mensajeError = err.error?.message || 'Conflicto al registrar el paquete.';
        } else {
          this.mensajeError = err.error?.message || 'Error al registrar el paquete. Verifique los datos e intente nuevamente.';
        }
        this.cdr.markForCheck();
      },
    });
  }

  cerrarModalRegistro(): void {
    this.modalRegistroAbierto = false;
    this.cdr.markForCheck();
  }

  verPaquete(): void {
    this.modalRegistroAbierto = false;
    this.cdr.markForCheck();
    void this.router.navigate(['/operador/consulta-paquetes']);
  }

  async copiarCodigoSeguimiento(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.codigoSeguimiento);
      this.codigoCopiado = true;
    } catch {
      this.codigoCopiado = false;
    }
    this.cdr.markForCheck();
  }

  registrarOtro(): void {
    this.modalRegistroAbierto = false;
    this.limpiarFormulario();
  }

  imprimirRegistro(): void {
    window.print();
  }

  limpiarFormulario(): void {
    this.enviado = false;
    this.guardando = false;
    this.mensajeError = '';
    this.erroresServidor = {};
    this.totalEstimadoServidor = null;
    this.camposTocados.clear();
    this.busquedaDireccion = '';
    this.sugerenciasDireccion = [];
    this.buscandoDirecciones = false;
    this.geocodificandoPunto = false;
    this.correoInfo = '';

    this.punto = null;
    if (this.marcador && this.mapa) {
      this.mapa.removeLayer(this.marcador);
      this.marcador = undefined;
    }
    this.mapa?.setView([-12.0464, -77.0428], 12);

    this.tipoDocumentoRemitente = 'DNI';

    this.remitente = {
      documento: '',
      nombre: '',
      celular: '',
      correo: '',
    };

    this.destinatario = {
      nombre: '',
      dni: '',
      celular: '',
      correo: '',
    };

    this.direccion = {
      departamento: 'Lima',
      provincia: 'Lima',
      distrito: '',
      tipoVia: '',
      nombreVia: '',
      numero: '',
      manzana: '',
      lote: '',
      referencia: '',
    };

    this.paquete = {
      pesoReal: null,
      largo: null,
      ancho: null,
      alto: null,
    };
    this.cdr.markForCheck();
  }
}
