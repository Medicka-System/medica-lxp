// GENERADO por scripts/convert_plantillas.py — NO editar a mano.
// Plantillas de reporte reales (Fase 2) convertidas de campus-lxp-mocks/Plantillas de reportes.
export type PlantillaReal = { nombre: string; tipo: string; estructura: unknown };

export const PLANTILLAS_REALES: PlantillaReal[] = [
  {
    "nombre": "REPORTE PEDIATRICO",
    "tipo": "Abdominal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "ULTRASONIDO PEDIATRICO\nSe realiza rastreo con transductor lineal y convexo con equipo de alta resolución en paciente pediátrico\nEl rastreo de la fontanela anterior presenta surcos y cisursa con adecuada profundidad, el parénquima de aspecto homogéneo sin lesiones focales. La línea media de aspecto central. El sistema ventricular supra e infratentorial con adecuado amplitud. La vascularidad se encuentra respetada\nEn abdomen se identifica piloro con adecuada morfología, la longitud es de __ mm, el calibre presenta medida de ___ mm. Existe adecuado paso del contenido alimentario al duodeno sin otros hallazgos\nLas glándulas suprarrenales y riñones con aspecto habitual. Ambos riñones de aspecto simétrico con bordes lobulados, el parénquima de aspecto homogéneo. No hay datos de ectasisa pielica A la exploración con el Doppler color con vascularidad conservada\nLa cadera de forma bilateral muestra adecuada congruencia, existe adecuada relación entre estructuras oseas, a la exploración se encuentra angulo alfa de ___ y angulo beta de ____. La cobertura acetabular esta conservada\nIMPRESINO DIAGNOSTICA\nEstudio dentro de limites normales"
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ]
    }
  },
  {
    "nombre": "Torax urgencias Rush",
    "tipo": "Abdominal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado con equipo de alta resolución con transductor convexo multifrecuencia (5-7 Mhz)y lineal, con función en escala de grises , cortes convencionales, y modo M reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Tórax: se identifican los planos cutáneos, tejido subcutáneo, tejido muscula, arcos costales y pleura la cual conserva su ecogenicidad y con deslizamiento conservado, a este nivel sin identificar colecciones. A la aplicación de el modo M se visualizan líneas “A” y líneas “B” conservadas formando el patrón de arena y el mar.\n."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Sin hallazgos de patología demostrable por este protocolo de estudio.\nCorrelacionar con clínica y paraclínica a criterio de médico tratante.\nAtentamente:\nDr. | Dalia Carballo/ Jacobo dimas /Fernando de la Piedra\nCédula Profesional | 4047734"
    }
  },
  {
    "nombre": "Vesicoprostatico",
    "tipo": "Renal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado con equipo de alta resolución y transductor convexo multifrecuencia (3-5 Mhz), con función en escala de grises y Doppler color, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Se explora vejiga encontrándola en situación y morfología habitual, pared ecogénica con grosor de. cm, interior anecoico, distendida con dimensiones de cm x cm x cm, en sus ejes longitudinal, anteroposterior y transversal respectivamente, correspondiente con un volumen premiccional calculado de cc y volumen posmiccional de cc. A la exploración con Doppler color se visualizan ambos jets ureterales.\n\nPróstata en situación habitual, bordes regulares, bien definidos, mide cm x cm x cm , en sus ejes longitudinal, anteroposterior y transversal respectivamente, correspondiente con un volumen de cc, parénquima homogéneo sin evidenciar lesiones focales o difusas, presenta un índice de protrusión de…cm, a la exploración Doppler color presenta adecuada saturación vascular. \n\nVesículas seminales en adecuada situación y morfología, con diámetro anteroposterior de cm, homogéneas sin evidenciar lesiones focales o difusas."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Próstata con peso estimado de \nÍndice de protrusión prostática de\nVolumen de orina residual de aproximadamente el…. -%\nCorrelacionar con clínica y estudios de extensión de acuerdo con criterio de médico tratante.\nAtentamente:\nDr.\nCédula Profesional"
    }
  },
  {
    "nombre": "Antebrazo",
    "tipo": "MSK",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Nombre\nEdad | Fecha\nAntebrazo\nMétodo de estudio\nSe realiza ultrasonido músculo esquelético de antebrazo derecho analizando partes blandas así cómo estructuras músculo esqueléticas y trayectos nerviosos dentro de lo valorable, con transductor lineal de 12 mhz, observando los siguientes hallazgos:\nPiel con espesor y ecogenicidad habitual, sin lesiones a este nivel.\nA nivel de tejido celular subcutáneo no se identifican lesiones. presenta adecuada ecogenicidad y espesor.\nCara anterior/ volar:\nMúsculos que conservan su morfología y patrón fibrilar sin evidencia de rotura tendinosa en las diversas estructuras exploradas.\nNervio Mediano en todo su trayecto con patrón fascícular conservado y dimensiones dentro de lo normal sin evidencia de atrapamiento en territorio del pronador ni entre los flexores superficial y profunda ni en el resto de localizaciones mayor mente visibles.\nNervio del cubital Desde el canal epitroqueal hasta la entrada del canal de Guyon de características conservadas.\nCara posterior:\nMúsculos de la cara posterior con situación y patrón fibrilar conservado sin evidencia de lesiones a este nivel.\n.\nConclusión | Estudio sin evidencia de alteración miotendinosa de las estructuras valoradas.\nSin datos que sugieran atrapamiento nervioso en los sitios valorados.\nCorrelación clínica y con estudios \ncomplementarios (RM de hombro) a critetrio de médico tratante.\nElaboró | _______________________"
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Conclusión | Estudio sin evidencia de alteración miotendinosa de las estructuras valoradas.\nSin datos que sugieran atrapamiento nervioso en los sitios valorados.\nCorrelación clínica y con estudios \ncomplementarios (RM de hombro) a critetrio de médico tratante.\nElaboró | _______________________"
    }
  },
  {
    "nombre": "Brazo",
    "tipo": "MSK",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Nombre\nEdad | Fecha\nBrazo\nMétodo de estudio\nSe realiza ultrasonido músculo esquelético de brazo derecho analizando partes blandas así cómo estructuras músculo esqueléticas y trayectos nerviosos dentro de lo valorable, con transductor lineal de 12 MHz,  observando los siguientes hallazgos::\nPiel con espesor y ecogenicidad habitual, sin lesiones a este nivel.\nA nivel de tejido celular subcutáneo no se identifican lesiones. presenta adecuada ecogenicidad y espesor.\nCara anterior de brazo:\nVientres de la cabeza larga y corta del biceps braquial así como el tendón de la porción larga del biceps que conservan su patrón fibrilar, espesor habitual y músculos de ecogenicidad media a baja y tendones media a alta..\nMúsculo braquial y coracobraquial dentro de lo valorable sin alteraciones.\nCara posterior:\nCabeza larga, medial y lateral del tríceps con una configuración habitual sin evidencia de lesiones intramusculares, tendón conjunto hacia el olecranon de aspecto fibrilar y espesor conservado y ecogenicidad normal.\nPaquete neurovascular:\nArteria y vena braquial las cuales conservan un calibre regular, con flujo pulsatil sin evidencia de ecos en su interior ni dilataciones, con adecuada repleción de color a la modalidad Doppler.\nSe sigue el trayecto del nervio mediano desde el compartimiento interno hasta el pliegue del codo observando patrón fascicular conservado, sin evidencia de lesiones intra o perineural. no se observa apófisis supracondílea como variante anatómica.\nNervio cubital en toda su extensión hasta el canal epitroclear sin evidencia de compresiones.\nNervio radial de características conservadas, adyacente a la arteria braquial profunda sobre la cara anterolateral del brazo, sin evidencia de lesión en el surco espiral.\n.\nConclusión | Estudio sin evidencia de alteración miotendinosa de las estructuras valoradas.\nSin datos que sugieran atrapamiento nervioso\nCorrelación clínica y con estudios \ncomplementarios (RM de hombro) a critetrio de médico tratante.\nElaboró | _______________________"
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Conclusión | Estudio sin evidencia de alteración miotendinosa de las estructuras valoradas.\nSin datos que sugieran atrapamiento nervioso\nCorrelación clínica y con estudios \ncomplementarios (RM de hombro) a critetrio de médico tratante.\nElaboró | _______________________"
    }
  },
  {
    "nombre": "Abdomen Superior Riñón",
    "tipo": "Renal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado con equipo de alta resolución y transductor convexo multifrecuencia (5-7 Mhz), con función en escala de grises y Doppler color, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio"
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ]
    }
  },
  {
    "nombre": "Apendice Normal",
    "tipo": "Abdominal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "De forma sistemática y mediante maniobras dinámicas convencionales para la exploración de hombro, se realiza estudio con equipo de alta resolución y transductor lineal multifrecuencia en escala de grises, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "En fosa iliaca derecha se identifica imagen tubular con aspecto cilíndrico, presenta medida menor a 6 mm de calibre, presenta vascularidad conservada con el doppler color. A la maniobra de compresión existe adecuada respuesta \nImpresión diagnóstica\nApéndice normal por este método de estudio"
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Sin hallazgos de patología demostrables por este método de estudio.\nDe continuar con clínica sugestiva de lesión miotendinosa u ósea correlacionar con estudio de extensión (Resonancia Magnética).\nAtentamente:\nDr.\nCédula Profesional"
    }
  },
  {
    "nombre": "Apendice Patologico",
    "tipo": "Abdominal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "De forma sistemática y mediante maniobras dinámicas convencionales para la exploración de hombro, se realiza estudio con equipo de alta resolución y transductor lineal multifrecuencia en escala de grises, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Apéndice patológico \nEn fosa iliaca derecha se identifica imagen tubular con aspecto cilíndrico, presenta calibre superior a 6 mm, existe aumento de la vascularidad periférica con el doppler color . A la maniobra de compresión no existe colapso de paredes. La grasa presenta aumento difuso en la ecogenicidad \nImpresión diagnóstica\nCambios compatibles con apendicitis aguda"
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Sin hallazgos de patología demostrables por este método de estudio.\nDe continuar con clínica sugestiva de lesión miotendinosa u ósea correlacionar con estudio de extensión (Resonancia Magnética).\nAtentamente:\nDr.\nCédula Profesional"
    }
  },
  {
    "nombre": "Cuello Tiroides",
    "tipo": "Tiroideo",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado con equipo de alta resolución y transductor lineal multifrecuencia (5-7 Mhz), con función en escala de grises y Doppler color, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Tiroides:\nIstmo homogéneo con eje anteroposterior de 0.26cm.\n\nLóbulo tiroideo derecho de contornos regulares, situación y morfología habituales, sus dimensiones de 1.15 x 1.13 x 2.23 cm en sus ejes longitudinal, anteroposterior y transverso respectivamente, las cuales se corresponden con un volumen calculado de 1.5 cc. la exploración con Doppler color vasculatura central y periférica conservadas. \n\nLóbulo tiroideo izquierdo de contornos regulares, situación y morfología habituales, sus dimensiones con de 2.26 x 1.26 x 1.06 cm en sus ejes longitudinal, anteroposterior y transverso respectivamente, las cuales se corresponden con un volumen calculado de 3cc, a la exploración con Doppler color vasculatura central y periférica conservadas.\n\nDe forma bilateral se inspeccionan ambas glándulas submandibulares las cuales se encuentran de contornos regulares, con parénquima homogéneo, sin agregados."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Estudio con características ecográficas normales TI-RADS 1\nCorrelacionar con clínica y paraclínica a criterio de médico tratante.\nAtentamente:\nDr. | Miguel Ángel Velázquez Maldonado\nCédula Profesional | 10601334"
    }
  },
  {
    "nombre": "Doppler Hepático",
    "tipo": "Doppler",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Hígado de morfología y situación habituales, se muestra de contornos regulares y bien delimitados, en el lóbulo derecho se encuentra con un eje longitudinal de xx cm. El patrón ecográfico se encuentra homogéneo sin evidencia de lesiones focales o difusas demostrables por este protocolo de estudio, la relación hepatorrenal sin agregados. Vía biliar intra y extrahepática sin alteraciones (conducto colédoco con calibre de xx cm).​\n ​\nSin presencia de líquido libre en espacio hepatorrenal y esplenorrenal. ​\n ​\nVena porta: a la exploración con Modo B y Doppler color muestra calibre de xx cm y saturación conservada respectivamente. Mediante función Doppler espectral se observa flujo anterógrado, de tipo ondulante, fásico monofásico con velocidad de xx cm/s, índice de pulsatilidad mayor de 0.5. ​\n ​\nArteria hepática: a la exploración con Doppler color de saturación y calibre conservados. Mediante función Doppler espectral se identifica flujo anterógrado, de tipo pulsátil, fásico, monofásico, diinflexional con velocidad pico sistólica (VPS) de xx cm/s y velocidad al final de la diástole (VFD) de xx cm/s, que se corresponden con un índice de resistencia (IR) de xx.​\n ​\nVenas hepáticas: a la exploración con Doppler color de saturación y calibre conservados. Mediante función Doppler espectral se identifica flujo anterógrado, de tipo pulsátil, fásico, bi/trifásico, tetrainflexional ondas “A”, “S”, “v” y “D” de morfología y relación habituales. ​\n ​\nVesícula biliar de morfología y situación habituales, muestra una pared sin engrosamiento de hasta xx mm, se encuentra distendida al momento del estudio, sus dimensiones son de xx x xx x xx cm para sus ejes longitudinal, anteroposterior y transverso respectivamente, las cuales se corresponden con un volumen calculado de xx cc. Su interior de observa anecoico. A la exploración con función Doppler color no muestra alteraciones. ​\n ​\nPáncreas de morfología y situación conservada, se logra visualizar cabeza, cuello, cuerpo y cola, con dimensiones en su eje anteroposterior de xx x xx xx xx x xx cm respectivamente, el parénquima homogéneo sin agregados. A la exploración con función Doppler color, vena esplénica conserva saturación. ​\n ​\nBazo de morfología y situación conservadas, de bordes regulares y bien delimitados, muestra dimensiones de xx x xx x xx cm en sus ejes longitudinal, anteroposterior y transverso respectivamente, que se corresponden con un volumen calculado de xx cc. Parénquima homogéneo. A la exploración con función Doppler color el hilio esplénico se muestra con saturación conservada."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Atentamente:\nDr.\nCédula Profesional"
    }
  },
  {
    "nombre": "Doppler Obstétrico",
    "tipo": "Doppler",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado (paciente con deseo de micción) con equipo de alta resolución y transductor convexo multifrecuencia (5-7 Mhz), con función en escala de grises y funciones Doppler color y espectral, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Útero aumentado de volumen a expensas de producto único el cual muestra movimientos espontáneos al momento de la exploración, se encuentra en libre posición (o en su defecto describir: presentación cefálica/podálica, dorso longitudinal/transverso, anterior/posterior/derecho/ izquierdo), presenta activad cardiaca de xxx latidos por minuto (LPM), se explora intencionadamente, hemisferios cerebrales (con saturación conservada del círculo arterial a la exploración con función Doppler color) y cerebelosos sin alteraciones, perfil nasal y globos oculares sin agregados, cuello sin/con evidencia de circular de cordón simple/doble, etc, la columna vertebral conserva relación habitual sin datos de soluciones de continuidad demostrables por este protocolo de estudio, corazón con cuatro cámaras presentes, diafragma íntegro, ambos riñones de situación habitual, estómago distendido, vejiga distendida con relación de arterias conservada, extremidades torácicas y pélvicas presentes, sin evidencia de anomalías anatómicas demostrables por este protocolo de estudio, se exploran genitales con sexo aparente xx/xy. Cordón umbilical con relación dos arterias y una vena conservadas.\n\nFetometría:\nDiámetro biparietal………………….xx cm\nCircunferencia craneal……………..xx cm\nPerímetro abdominal……………….xx cm\nLongitud femoral……………………..xx cm\nPeso aproximado……………………..xx grs\n\nPlacenta normoinserta fúndica/corporal/fúndica corporal anterior/posterior; no muestra desprendimientos ni hematomas al momento del estudio; con/sin presencia de múltiples lagunas, que a la exploración con Doppler color no muestran vascularidad; también calcificaciones puntiformes asociadas. Se reporta un grado xx en la escala de maduración placentaria (Grannum).\n\nLíquido amniótico de características anecoicas habituales, con índice de (de Phelan) xxx cm por método de 4 cámaras.\n\nCérvix cerrado, sin alteraciones demostrables por este método de estudio.\n\nDESCRIBIR EL PATRÓN DE ESPECTRO DE LAS ESTRUCTURAS VASCULARES TOMADAS."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Embarazo intrauterino de xx semanas por fetometría/longitud femoral, que muestra actividad cardiaca de xx LPM.\nÍndice de líquido amniótico de xxx cm medido por método de 4 cámaras.\nPlacenta normoinserta (describir en donde) grado xx en la escala de maduración.\nCorrelacionar con clínica y paraclínica a criterio de médico tratante.\nAtentamente:\nDr. | XXXXX XXXXX XXXXX\nCédula Profesional | XXXXXXXX"
    }
  },
  {
    "nombre": "Doppler Renal",
    "tipo": "Doppler",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado con equipo de alta resolución y transductor convexo multifrecuencia (3-7 Mhz), con función en escala de grises, Doppler color, Doppler espectral y potenciado, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Riñón derecho de morfología y situación conservada, se muestra de contornos lisos y bien definidos, sus dimensiones de xx cm en sus ejes longitudinal, anteroposterior y transverso respectivamente, correspondiendo con un volumen calculado de xx cm. El parénquima se muestra homogéneo sin lesiones que comentar, la relación corticomedular se encuentra conservada, al momento del estudio sin datos de ectasia u obstrucciones del sistema pielocalicial demostrables por este método de estudio. A la exploración con función Doppler color, se muestra saturación conservada.\n\nRiñón izquierdo de morfología y situación conservada, se muestra de contornos lisos y bien definidos, sus dimensiones de xx x xx x xx cm en sus ejes longitudinal, anteroposterior y transverso respectivamente, correspondiendo con un volumen calculado de xx cc. El parénquima se muestra homogéneo sin lesiones que comentar, la relación corticomedular se encuentra conservada, al momento del estudio sin datos de ectasia u obstrucciones del sistema pielocalicial demostrables por este método de estudio. A la exploración con función Doppler color, se muestra saturación conservada.\n\nA la exploración con Doppler pulsado, se muestran espectros de características descritas en la tabla que se anexa."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Sin hallazgos de patología demostrable por este protocolo de estudio.\nCorrelacionar con clínica y paraclínica a criterio de médico tratante.\nDirección | Tipo \nde Onda | Fasicidad | Inflexiones | VPS | VFD | IR | Normal/\nAnormal\nAORTA\nRiñón Derecho ( Índice Aórtico / Renal = )\nArteria Principal\nOstium\nTercio Proximal\nTercio Medio\nTercio Distal\nSegmentarias\nSuperior\nSegmentarias\nMedio\nSegmentarias Inferior\nRiñón Izquierdo ( Índice Aórtico / Renal = )\nArteria Principal\nOstium\nTercio Proximal\nTercio Medio\nTercio Distal\nSegmentarias\nSuperior\nSegmentarias\nMedio\nSegmentarias Inferior\nAtentamente:\nDr.\nCédula Profesional"
    }
  },
  {
    "nombre": "Ginecológico",
    "tipo": "Pélvico",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado con equipo de alta resolución y transductor endocavitario multifrecuencia (5-7 Mhz), con función en escala de grises y Doppler color, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Útero de morfología y situación conservadas, se encuentra en anteroflexión y/o versión, de contornos lisos y bien delimitados, el patrón miometrial homogéneo. Endometrio con un grosor de xx mm, no muestra lesiones focales.\n \nCérvix sin alteraciones demostrables por este método de estudio.\n \nOvario derecho de morfología habitual, contornos regulares, parénquima homogéneo con patrón folicular presente, dimensiones de xx x xx x xx cm en sus tres ejes mayores que se corresponden con un volumen calculado de xx cc. A la exploración con función Doppler color saturación conservada (EN CASO DE TOMAR UN ESPECTRO, DESCRIBIR LA ONDA).\n \nOvario izquierdo de morfología habitual, contornos regulares, parénquima homogéneo con patrón folicular presente, dimensiones de xx x xx x xx cm en sus tres ejes mayores que se corresponden con un volumen calculado de xx cc. A la exploración con función Doppler color saturación conservada (EN CASO DE TOMAR UN ESPECTRO, DESCRIBIR LA ONDA)."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Sin evidencia de patología demostrable por este protocolo de estudio.\nCorrelacionar con clínica y estudios de extensión a criterio de médico tratante.\nAtentamente:\nDr.\nCédula Profesional"
    }
  },
  {
    "nombre": "Hombro",
    "tipo": "MSK",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "De forma sistemática y mediante maniobras dinámicas convencionales para la exploración de hombro, se realiza estudio con equipo de alta resolución y transductor lineal multifrecuencia en escala de grises, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Región anterior: ​\nEscotadura intertubercular sin lesiones ocupantes de espacio. ​\nTendón de la cabeza larga del bíceps femoral con patrón ecográfico y grosor habituales. ​\nTendón del subescapular con patrón ecográfico y grosor habituales. ​\n​\nRegión Superior: ​\nArticulación acromioclavicular con dimensiones conservadas. ​\n​\nRegión anterolateral: ​\nTendón del supraespinoso con patrón ecográfico y grosor habituales. ​\nA la maniobra de abducción sin evidencia de pinzamiento. ​\nBursa subdeltoidea-subacromial sin alteraciones. ​\n​\nRegión posterior: ​\nTendón del infraespinoso con patrón ecográfico y grosor habituales. ​\nTendón del redondo menor con patrón ecográfico y grosor habituales. ​\nGrosor del manguito de los rotadores sin alteraciones. ​\nLabrum y articulación glenohumeral sin alteraciones demostrables por este protocolo de estudio. ​"
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Sin hallazgos de patología demostrables por este método de estudio.\nDe continuar con clínica sugestiva de lesión miotendinosa u ósea correlacionar con estudio de extensión (Resonancia Magnética).\nAtentamente:\nDr.\nCédula Profesional"
    }
  },
  {
    "nombre": "Hígado y vias biliares",
    "tipo": "Abdominal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado con equipo de alta resolución y transductor convexo multifrecuencia (5-7 Mhz), con función en escala de grises y Doppler color, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Hígado de morfología y situación habituales, se muestra de contornos regulares y bien delimitados, en el lóbulo derecho se encuentra con un eje longitudinal de xx cm. El patrón ecográfico se encuentra homogéneo sin evidencia de lesiones focales o difusas demostrables por este protocolo de estudio, la relación hepatorrenal sin agregados. Las venas supra hepáticas y porta se encuentran de calibre sin alteraciones, y a la exploración con función Doppler color se encuentran con saturación conservada.\nCalibre de vena porta:\nCalibre de vía biliar extrahepática:\n\nSin presencia de líquido libre en espacio hepatorrenal.\n\nVesícula biliar de morfología y situación habituales, muestra una pared sin engrosamiento de hasta xx mm, se encuentra distendida al momento del estudio, sus dimensiones son de xx x xx x xx cm para sus ejes longitudinal, anteroposterior y transverso respectivamente, las cuales se corresponden con un volumen calculado de xx cc. Su interior de observa anecoico. A la exploración con función Doppler color no muestra alteraciones."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Sin hallazgos de patología demostrable por este protocolo de estudio.\nCorrelacionar con clínica y paraclínica a criterio de médico tratante.\nAtentamente:\nDr.\nCédula Profesional"
    }
  },
  {
    "nombre": "Hígado",
    "tipo": "Abdominal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado de glándula hepática con equipo de alta resolución y transductor convexo multifrecuencia (5-7 Mhz), con función en escala de grises y Doppler color, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Hígado de morfología y situación habituales, se muestra de contornos regulares y bien delimitados, se encuentra con un eje longitudinal de xx cm. El patrón ecográfico se encuentra homogéneo sin evidencia de lesiones focales o difusas demostrables por este protocolo de estudio, la relación hepatorrenal sin agregados. Las venas supra hepáticas y porta se encuentran de calibre sin alteraciones, y a la exploración con función Doppler color se encuentran con saturación conservada.\n\nCalibre de vena porta:\nCalibre de vía biliar extrahepática:\n\n\nSin presencia de líquido libre en espacio hepatorrenal."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Sin hallazgos de patología demostrable por este protocolo de estudio.\nCorrelacionar con clínica y paraclínica a criterio de médico tratante.\nAtentamente:\nDr.\nCédula Profesional"
    }
  },
  {
    "nombre": "Mama Bilateral",
    "tipo": "Mama",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado con equipo de alta resolución y transductor lineal multifrecuencia (5-7 Mhz), con función en escala de grises y Doppler color, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Tejido homogéneo graso/homogéneo fibroglandular/heterogéneo.\nLa piel es de grosor normal.\nSin evidencia de nódulos sólidos o quísticos, así como de distorsiones de la arquitectura.\nRegión retroareolar con ductos de calibre y trayectos conservados y anecoicos.\nGanglios axilares bilaterales de morfología normal, conservan hilio graso y grosor cortical. O en caso de que no haya ganglios: Región axilar bilateral sin evidencia de adenopatías o lesiones representativas que comentar."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Patrón homogéneo graso/homogéneo fibroglandular/heterogéneo.\nGanglios axilares bilaterales de características normales.\nCategoría BI-RADS 1. Estudio normal.\nAtentamente:\nDr. | XXXXX XXXXX XXXXX\nCédula Profesional | XXXXXXXX"
    }
  },
  {
    "nombre": "Obstetrico 1er",
    "tipo": "Obstétrico",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado (paciente con deseo de micción) con equipo de alta resolución y transductor endocavitario multifrecuencia (5-7 Mhz), con función en escala de grises y funciones Doppler color y espectral, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Útero de morfología y situación conservadas, se encuentra en anteroflexión, de contornos lisos y bien delimitados, el patrón miometrial homogéneo. Se identifica reacción decidual, cavidad endometrial ocupada por saco gestacional el cual mide xx x xx x xx cm en sus tres ejes mayores, lo que se correlaciona con una edad gestacional de xx semanas y un diámetro medio de xx; dentro del mismo producto único vivo con longitud craneocaudal (LCC) de xx cm correspondientes con embarazo de xx semanas. Placenta normoinserta, al momento del estudio sin evidencia de desprendimientos, hematomas o lesiones agregadas.\n\nCérvix cerrado, sin alteraciones demostrables por este método de estudio.\n\nOvario derecho de morfología habitual, contornos regulares, parénquima homogéneo con patrón folicular presente, con/sin presencia de cuerpo lúteo. A la exploración con función Doppler color saturación conservada.\n\nOvario izquierdo de morfología habitual, contornos regulares, parénquima homogéneo con patrón folicular presente, con/sin presencia de cuerpo lúteo. A la exploración con función Doppler color saturación conservada."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Sin hallazgos de patología demostrable por este protocolo de estudio.\nCorrelacionar con clínica y paraclínica a criterio de médico tratante.\nAtentamente:\nDr. | XXXXX XXXXX XXXXX\nCédula Profesional | XXXXXXXX"
    }
  },
  {
    "nombre": "Obstétrico 2-3er",
    "tipo": "Obstétrico",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado (paciente con deseo de micción) con equipo de alta resolución y transductor convexo multifrecuencia (5-7 Mhz), con función en escala de grises y funciones Doppler color y espectral, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Útero aumentado de volumen a expensas de producto único el cual muestra movimientos espontáneos al momento de la exploración, se encuentra en libre posición (o en su defecto describir: presentación cefálica/podálica, dorso longitudinal/transverso, anterior/posterior/derecho/ izquierdo), presenta activad cardiaca de xxx latidos por minuto (LPM), se explora intencionadamente, hemisferios cerebrales (con saturación conservada del círculo arterial a la exploración con función Doppler color) y cerebelosos sin alteraciones, perfil nasal y globos oculares sin agregados, cuello sin/con evidencia de circular de cordón simple/doble, etc, la columna vertebral conserva relación habitual sin datos de soluciones de continuidad demostrables por este protocolo de estudio, corazón con cuatro cámaras presentes, diafragma íntegro, ambos riñones de situación habitual, estómago distendido, vejiga distendida con relación de arterias conservada, extremidades torácicas y pélvicas presentes, sin evidencia de anomalías anatómicas demostrables por este protocolo de estudio, se exploran genitales con sexo aparente xx/xy. Cordón umbilical con relación dos arterias y una vena conservadas.\n\nFetometría:\nDiámetro biparietal………………….xx cm\nCircunferencia craneal……………..xx cm\nPerímetro abdominal……………….xx cm\nLongitud femoral……………………..xx cm\nPeso aproximado……………………..xx grs\n\nPlacenta normoinserta fúndica/corporal/fúndica corporal anterior/posterior; no muestra desprendimientos ni hematomas al momento del estudio; con/sin presencia de múltiples lagunas, que a la exploración con Doppler color no muestran vascularidad; también calcificaciones puntiformes asociadas. Se reporta un grado xx en la escala de maduración placentaria (Grannum).\n\nLíquido amniótico de características anecoicas habituales, con índice de (de Phelan) xxx cm por método de 4 cámaras.\n\nCérvix cerrado, sin alteraciones demostrables por este método de estudio."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Embarazo intrauterino de xx semanas por fetometría/longitud femoral, que muestra actividad cardiaca de xx LPM.\nÍndice de líquido amniótico de xxx cm medido por método de 4 cámaras.\nPlacenta normoinserta (describir en donde) grado xx en la escala de maduración.\nCorrelacionar con clínica y paraclínica a criterio de médico tratante.\nAtentamente:\nDr. | XXXXX XXXXX XXXXX\nCédula Profesional | XXXXXXXX"
    }
  },
  {
    "nombre": "Pared Abdominal",
    "tipo": "MSK",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado con equipo de alta resolución y transductor lineal multifrecuencia (5-7 Mhz), con función en escala de grises y Doppler color, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Se explora pared abdominal anterior desde apófisis xifoides hasta sínfisis de pubis pasando por cicatriz umbilical, en cortes axiales y longitudinales, identificando piel de grosor habitual, tejidos adiposo de características ecográficas normales, la línea alba respetada con patrón fibrilar conservado, no se observan defectos de pared con el paciente en decúbito y en bipedestación alternando entre estados de reposo con maniobra de Valsalva.\n\nPosteriormente de forma bilateral se explora de la misma forma hacia línea media clavicular desde reborde costal hasta crestas iliacas identificando capas musculares con patrón fibrilar conservado, línea peritoneal íntegra sin defectos de pared demostrables por este protocolo de estudio.\n\nMediante cortes convencionales se procede a identificar con función Doppler color el trayecto del paquete vascular a nivel de vasos iliacos externos previo a su paso por el conducto femoral, se observa canal inguinal, así como arterias hipogástricas; se explora en sus tres tercios correspondientes con el paciente en decúbito y en bipedestación alternando entre estados de reposo y maniobra de Valsalva sin identificar defectos de pared demostrables."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Sin evidenciad de defectos de pared demostrables por medio de este protocolo de estudio.\nNo hay datos de masas o lesiones ocupantes de espacio demostrables por este método de estudio.\nCorrelacionar con clínica y estudios de extensión de acuerdo con criterio de médico tratante.\nAtentamente:\nDr.\nCédula Profesional"
    }
  },
  {
    "nombre": "Páncreas y Bazo",
    "tipo": "Abdominal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado con equipo de alta resolución y transductor convexo multifrecuencia (5-7 Mhz), con función en escala de grises y Doppler color, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Hígado de morfología y situación habituales, se muestra de contornos regulares y bien delimitados, en el lóbulo derecho se encuentra con un eje longitudinal de xx cm. El patrón ecográfico se encuentra homogéneo sin evidencia de lesiones focales o difusas demostrables por este protocolo de estudio, la relación hepatorrenal sin agregados. Las venas supra hepáticas y porta se encuentran de calibre sin alteraciones, y a la exploración con función Doppler color se encuentran con saturación conservada.\nCalibre de vena porta:\nCalibre de vía biliar extrahepática:\n\nSin presencia de líquido libre en espacio hepatorrenal y esplenorrenal.\n\nVesícula biliar de morfología y situación habituales, muestra una pared sin engrosamiento de hasta xx mm, se encuentra distendida al momento del estudio, sus dimensiones son de xx x xx x xx cm para sus ejes longitudinal, anteroposterior y transverso respectivamente, las cuales se corresponden con un volumen calculado de xx cc. Su interior de observa anecoico. A la exploración con función Doppler color no muestra alteraciones.\n\nPáncreas de morfología y situación conservada, se logra visualizar cabeza, cuello, cuerpo y cola, con dimensiones en su eje anteroposterior de xx x xx xx xx x xx cm respectivamente, el parénquima homogéneo sin agregados. A la exploración con función Doppler color, vena esplénica conserva saturación. \n\nBazo de morfología y situación conservadas, de bordes regulares y bien delimitados, muestra dimensiones de xx x xx x xx cm en sus ejes longitudinal, anteroposterior y transverso respectivamente, que se corresponden con un volumen calculado de xx cc. Parénquima homogéneo. A la exploración con función Doppler color el hilio esplénico se muestra con saturación conservada."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Sin hallazgos de patología demostrable por este protocolo de estudio.\nCorrelacionar con clínica y paraclínica a criterio de médico tratante.\nAtentamente:\nDr.\nCédula Profesional"
    }
  },
  {
    "nombre": "Rodilla",
    "tipo": "MSK",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado con equipo de alta resolución y transductor lineal multifrecuencia (10-17 Mhz), con función en escala de grises, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Compartimiento anterior: ​\nPaciente en decúbito supino, con rodilla levente flexionada (20-30°) se logran identificar las porciones distales de los músculos del cuádriceps (vastos medial, lateral, intermedio y recto femoral), en sentido inferior de observa el complejo miotendinoso del del cuádriceps, patela y tendón rotuliano con su inserción en la tuberosidad tibial mostrando patrón ecográfico habitual. En estos planos se observa el cartílago troclear y las bursas supra, pre e infra patelares sin alteraciones demostrables. ​\n\nCompartimiento medial: ​\nSe le pide al paciente una leve rotación externa de la rodilla y con el transductor en planos coronales y axiales se identifica patrón fibrilar normal del ligamento colateral medial, así como adecuada ecogenicidad y morfología triangular normal del cuerno anterior del menisco ipsilateral. Con el transductor en un plano discretamente más posterior se logra observar el paso de los tendones correspondientes a la llamada “pata de ganso”, de anterior a posterior el sartorio, grácil y semitendinoso. No se identifica líquido libre en las bursas correspondientes.\n\nCompartimiento lateral: ​\nSe le solicita a paciente una leve flexión y rotación interna de la rodilla logrando identificar en planos coronales y axiales la banda iliotibial con su inserción en el tubérculo del cóndilo tibial lateral. En un plano discretamente más posterior y superior se identifica la fosa del tendón poplíteo y el ligamento colateral medial sin alteraciones demostrables. Posteriormente se observa el tendón del bíceps femoral, así como la marca topográfica del nervio peroneo sin agregados. Cuerno anterior del menisco lateral y bursas a este nivel sin patología que demostrar.\n\nCompartimiento posterior: ​\nCon el paciente en decúbito ventral se explora desde tercio proximal de pierna observando el trayecto de ambos vientres del músculo digástrico, el medial se continúa hasta su relación anatómica con el tendón del semimembranoso sin identificar lesiones a este nivel (Quiste de Baker); se logran observar los cuernos posteriores d ambos meniscos sin evidencia de lesión, así como ligamento cruzado posterior ecográficamente sin lesiones aparentes. Resto de hueco poplíteo sin evidencia de lesiones ocupativas de espacio; mediante exploración con Doppler color se muestra saturación de arteria y vena poplíteas conservada."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Sin hallazgos de patología demostrables por este método de estudio.\nDe continuar con clínica sugestiva de lesión miotendinosa u ósea correlacionar con estudio de extensión (Resonancia Magnética).\nAtentamente:\nDr.\nCédula Profesional"
    }
  },
  {
    "nombre": "Testicular",
    "tipo": "Abdominal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado con equipo de alta resolución y transductor lineal multifrecuencia (10-17 Mhz), con función en escala de grises, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Se explora ecográficamente escroto en su hemicomponente derecho e izquierdo observando grosor y ecogenicidad de piel conservados, así como ausencia de líquido o lesiones delimitantes en planos profundos.\n\nTestículo derecho\nDe morfología y situación conservadas, sus bordes son regulares y cuenta con dimensiones de xx x xx x xx cm en sus ejes longitudinal, anteroposterior y transverso respectivamente, que se corresponden con un volumen calculado de xx cc. El parénquima se muestra de ecotextura homogénea sin lesiones difusas o focales, mediastino testicular de trayecto habitual. A la exploración con función Doppler color se encuentra saturación central y periféricas sin agregados.\nEpididimo explorado de cabeza a cola con ecotextura conservada. Dimensiones de cabeza de xx x xx cm y de cola de xx x xx cm. Saturación conservada a la exploración Doppler color.\nPlexo pampiniforme explorado en escala de grises se muestra de calibre no mayor de 2 mm sin cambios a la maniobra de Valsalva y con saturación conservada en función Doppler color.\n\nTestículo izquierdo\nDe morfología y situación conservadas, sus bordes son regulares y cuenta con dimensiones de xx x xx x xx cm en sus ejes longitudinal, anteroposterior y transverso respectivamente, que se corresponden con un volumen calculado de xx cc. El parénquima se muestra de ecotextura homogénea sin lesiones difusas o focales, mediastino testicular de trayecto habitual. A la exploración con función Doppler color se encuentra saturación central y periféricas sin agregados.\nEpididimo explorado de cabeza a cola con ecotextura conservada. Dimensiones de cabeza de xx x xx cm y de cola de xx x xx cm. Saturación conservada a la exploración Doppler color.\nPlexo pampiniforme explorado en escala de grises se muestra de calibre no mayor de 2 mm sin cambios a la maniobra de Valsalva y con saturación conservada en función Doppler color."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Sin hallazgos de patología demostrables por este método de estudio.\nAtentamente:\nDr.\nCédula Profesional"
    }
  },
  {
    "nombre": "Urgencias",
    "tipo": "Abdominal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "De forma sistemática y mediante maniobras dinámicas convencionales para la exploración de hombro, se realiza estudio con equipo de alta resolución y transductor lineal multifrecuencia en escala de grises, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Se realiza estudio solicitado con transductor convexo y equipo de alta resolución\nSe valora espacio hepatorrenal, esplenorrenal, fosas iliacas, ambos flancos y hueco pélvico sin evidencia de líquido \nSe realiza rastreo del epicardio observando corazón con adecuada contractibilidad sin evidencia de líquido \nLos vasos yugulares y femorales con adecuado calibre, muestran adecuada saturación con el doppler color, sin evidencia de trombosis\nA nivel pulmonar se observa adecuada morfología, con signo del murciélago conservado, existe adecuado signo de la playa con el modo m, a la exploración en grises se encuentra pleural ecogenica con signos habituales respetados \nImpresión diagnóstico \nEstudio dentro de límites normales"
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Sin hallazgos de patología demostrables por este método de estudio.\nDe continuar con clínica sugestiva de lesión miotendinosa u ósea correlacionar con estudio de extensión (Resonancia Magnética).\nAtentamente:\nDr.\nCédula Profesional"
    }
  },
  {
    "nombre": "Vías urinarias",
    "tipo": "Renal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado (paciente con deseo de micción) con equipo de alta resolución y transductor convexo multifrecuencia (5-7 Mhz), con función en escala de grises y Doppler color, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Riñón derecho de morfología y situación conservada, contornos lisos y bien definidos, sus dimensiones de xx x xx x xx cm en sus ejes longitudinal, anteroposterior y transverso respectivamente, correspondiendo con un volumen calculado de xx cc. El parénquima se muestra homogéneo sin lesiones que comentar, la relación corticomedular se encuentra conservada, al momento del estudio sin datos de ectasia u obstrucciones del sistema pielocalicial demostrables por este método de estudio. A la exploración con función Doppler color, se muestra saturación conservada.\n\nRiñón izquierdo de morfología y situación conservada, contornos lisos y bien definidos, sus dimensiones de xx x xx x xx cm en sus ejes longitudinal, anteroposterior y transverso respectivamente, correspondiendo con un volumen calculado de xx cc. El parénquima se muestra homogéneo sin lesiones que comentar, la relación corticomedular se encuentra conservada, al momento del estudio sin datos de ectasia u obstrucciones del sistema pielocalicial demostrables por este método de estudio. A la exploración con función Doppler color, se muestra saturación conservada.\n\nVejiga distendida a repleción, de bordes regulares y bien delimitados, su pared con un grosor de xx mm. Las dimensiones premicción son de xx x xx x xx cm en sus ajes longitudinal, anteroposterior y transverso respectivamente que se corresponden con un volumen calculado de xx cc. El interior se muestra anecoico y a la exploración con función Doppler color jets ureterales presentes. Las dimensiones postmicción de xx x xx x xx cm en sus ejes longitudinal, anteroposterior y transverso respectivamente para un volumen calculado de xx cc. Volumen residual de xx cc.\n\nPróstata de contornos lobulados y circunscritos, sus dimensiones de xx x xx x xx cm en sus ejes longitudinal, anteroposterior y transverso respectivamente para un volumen calculado de xx cc, el cual se corresponde con su peso en gramos. Índice de protrusión de xx cm\n\nVesículas seminales sin alteraciones demostrables por este método de estudio."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Volumen residual de xx %.\nPróstata con peso aproximado de xx grs.\nÍndice de protrusión de xx cm.\nSin hallazgos de patología demostrable por este protocolo de estudio.\nCorrelacionar con clínica y paraclínica a criterio de médico tratante.\nAtentamente:\nDr. | XXXXX XXXXX XXXXX\nCédula Profesional | XXXXXXXX"
    }
  },
  {
    "nombre": "Testicular pediatrico",
    "tipo": "Abdominal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realiza estudio de ultrasonido solicitado con equipo de alta resolución y transductor lineal multifrecuencia (10-17 Mhz), con función en escala de grises, cortes convencionales, reportando los siguientes hallazgos:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Se explora ecográficamente bolsa escrotal en su hemicomponente derecho e izquierdo observandose vacías al momento del estudio.\n\nTestículo derecho\nSe observa localizado en el tercio medio del canal inguinal ipsilateral, sus bordes son regulares y cuenta con dimensiones de 1.01 x 0.77 x 0.61 cm en sus ejes longitudinal, anteroposterior y transverso respectivamente, que se corresponden con un volumen calculado de 0.248 cc. El parénquima se muestra de ecotextura homogénea sin lesiones difusas o focales, mediastino testicular de trayecto habitual. A la exploración con función Doppler color se encuentra saturación central y periféricas sin agregados.\nEn canal inguinal derecho se observa imagen de características anecoicas y homogéneo, avascular de forma tubular, en relación a hidrocele del cordón espermático.    \n\nTestículo izquierdo\nSe observa localizado en el tercio distal del canal inguinal ipsilateral, sus bordes son regulares y cuenta con dimensiones de 1.11 x 0.93 x 0.63 cm en sus ejes longitudinal, anteroposterior y transverso respectivamente, que se corresponden con un volumen calculado de 0.340 cc. El parénquima se muestra de ecotextura heterogénea por áreas hipoecogénicas difusas, mediastino testicular de trayecto habitual. A la exploración con función Doppler color se observa vascularidad disminuida de forma cualitativa con respecto al contralateral.\nEn canal inguinal derecho se observa imagen de características heterogéneas a expensas de áreas ecogénicas en su interior que se continúan hasta la cavidad peritoneal visualizando defecto aponeurótico a nivel del anillo vascular profundo con dimensión de 0.46 cm."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Criptorquidia bilateral.\nHidrocele del cordón espermático derecho.\nImagen sugestiva de hernia inguinal indirecta izquierda.\nSe sugiere seguimiento y valoración por médico pediatra.\nAtentamente:\nDr. | Aarón Alejandro Landeros Díaz\nCédula Profesional | 11956566"
    }
  },
  {
    "nombre": "Transfontanelar",
    "tipo": "Abdominal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_tec",
          "tipo": "hallazgos",
          "titulo": "Técnica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tec",
              "tipo": "multitexto",
              "nombre": "Técnica",
              "valorDefecto": "Se realizo estudio ecográfico solicitado, en tiempo real, utilizando transductor convexo multifrecuencia, realizandose cortes multidireccionales, usando como ventana acústica la fontanela anterior, en donde se observó:"
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "Tejidos blandos superficiales de características normales.\n  \nFontanela anterior amplia que comunica con la posterior \n       \nParénquima cerebral se aprecia homogéneo con adecuada distribución de la sustancia gris y blanca, acorde a  la edad del paciente.\n\nSurcos conservados en profundidad y giros con amplitud y profundidad conservada, conservados en volumen.\nTalamos, núcleos de la base y cápsula interna se observan de morfología y ecotextura adecuada. surcos caudotalamicos de aspecto homogéneo."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": "Sin hallazgos de patología demostrable por este protocolo de estudio.\nAtentamente:\nDr. | Aarón Alejandro Landeros Díaz\nCédula Profesional | 11956566"
    }
  },
  {
    "nombre": "ULTRASONIDO TORAX",
    "tipo": "Abdominal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_hall",
          "tipo": "hallazgos",
          "titulo": "Hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_hall",
              "tipo": "multitexto",
              "nombre": "Hallazgos del estudio",
              "valorDefecto": "ULTRASONIDO TORAX\nSe realiza rastreo con transductor lineal y convexo con equipo de alta resolución en paciente pediátrico\nEl parénquima pulmonar muestra adecuada morfología, existe adecuada relación entre las estructuras oseas costales y la pleura\nLa pleura muestra aspecto ecogénico lineal de aspecto liso sin evidencia de alteraciones, se observan líneas A con morfología conservada sin otros hallazgos.\nA la exploración con el modo M existe adecuado signo de la playa con morfología pleural y de tejidos blandos de aspecto respetado\nNo se identifican cambios por derrame pleural, consolidación o patología intersticial por este método de estudio\nIMPRESINO DIAGNOSTICA\nEstudio dentro de limites normales"
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ]
    }
  },
  {
    "nombre": "USDG Obst 5-10.6 sem.",
    "tipo": "Obstétrico",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_med",
          "tipo": "hallazgos",
          "titulo": "Biometría fetal",
          "columnas": 1,
          "campos": [
            {
              "id": "c_med",
              "tipo": "tabla",
              "nombre": "Biometría",
              "columnas": [
                "Medida (mm)",
                "Percentil",
                "Comentario"
              ],
              "filas": [
                "DBP",
                "DOF",
                "Circunferencia cefálica",
                "Circunferencia abdominal",
                "Longitud femoral",
                "ILA / bolsillo mayor"
              ]
            }
          ]
        },
        {
          "id": "s_form",
          "tipo": "hallazgos",
          "titulo": "Formulario y hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_form",
              "tipo": "multitexto",
              "nombre": "Estudio y hallazgos",
              "valorDefecto": "Instrucciones generales: Realice una exploración ecográfica obstétrica, sin importar la edad gestacional, siguiendo la metodología correspondiente y empleando el formato con las imágenes de acuerdo a las semanas de gestación.\n​​Complete el siguiente formato de exploración con los datos obtenidos: Obstétrico del 1º trimestre. (semanas 5 a 10.6)​\nNombre: | Edad:\nMédico Tratante:\nFecha de nacimiento | Fecha de estudio:\nFecha de última Menstruación: | Amenorrea (semanas) | Confiable\nSi ☐No ☐\nEdad Gestacional: | Semanas | Por: Amenorra ☐\nUltrasonido Previo ☐\ndel         Trimestre | Fecha Probable de Parto:\nAntecedentes:\nIndicación:\nTipo de Estudio: | Tamizaje ☐  Dirigido ☐  Diagnóstico ☐\nVía:   Abdominal ☐       Vaginal ☐\n\nVisualización: Adecuada ☐   Limitada ☐\nComentarios:\nÚTERO\nAnteversoflexión ☐   Retroversoflexión ☐    Indiferente ☐\n\nContorno de la serosa: Regular ☐ Lobulada ☐ \n\nParedes miometriales: Simétricas ☐ Asimétricas ☐ \n\nEcogenicidad: Homogénea ☐ Heterogénea ☐\n\nLesiones miometriales   No ☐     Sí ☐    Número___        Localizadas ☐    Difusas ☐\n\nSitio, diámetro mayor y descripción:\nDimensiones:\nDiámetro | Milímetros | Comentarios:\nLongitudinal\nAnteroposterior\nTransverso\nVolumen\nEndometrio\nCérvix\nHallazgos:\nVesícula Gestacional:  Intrauterina ☐ Regular ☐ Irregular ☐ No visibles ☐  \nOtra localización ☐\n\nDimensiones: _______X ______X _______mm    Diámetro Medio _________mm \nEdad Gestacional__________ sem\n\nComentarios:\nSaco Vitelino:  Apariencia: Normal ☐ Anormal ☐ Medición ____mm Normal ☐ Anormal ☐\n\nComentarios:\nEmbrión: Longitud Embrionaria Máxima _______mm compatible con _______sem \nLatido cardiaco: Ausente ☐ Presente ☐   Rítmico si ☐   no ☐   Frecuencia _______LPM\n\nComentarios:\nOvarios:\nOVARIO DERECHO | OVARIO IZQUIERDO\nDiámetro | Milímetros\nLongitudinal\nAnteroposterior\nTransverso\nVolumen\nNormal ☐ Lesión ☐\nDescripción:\nCONCLUSIÓN:\nDIAGNÓSTICO\nCOMENTARIOS:\nMédico Examinador:\nCédula Profesional:\nFirma:\nInstrucciones: Ingrese en los siguientes recuadros la imagen correspondiente de las semanas 5 a 10.6 Obstétrico del 1º trimestre.\nNota: El recuadro se ajustará al tamaño de la imagen que inserte.\nCorte sagital del útero con Saco Gestacional\nImagen dual del Saco Gestacional con su medición en los tres planos ortogonales en MILIMETROS, cálculo del diámetro medio y edad gestacional.\nSaco Vitelino con su diámetro mayor en MILIMETROS\nEmbrión con la medición de su Longitud Embrionaria Máxima en MILIMETROS, y el cálculo de edad gestacional.\nDocumentar frecuencia cardiaca y medirla, en Modo M o Doppler Pulsado.\nNota: En caso de detectar alguna patología específica, agregue otras imágenes que la representen."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ]
    }
  },
  {
    "nombre": "USG Obstétrico 2 Trimestre",
    "tipo": "Obstétrico",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_med",
          "tipo": "hallazgos",
          "titulo": "Biometría fetal",
          "columnas": 1,
          "campos": [
            {
              "id": "c_med",
              "tipo": "tabla",
              "nombre": "Biometría",
              "columnas": [
                "Medida (mm)",
                "Percentil",
                "Comentario"
              ],
              "filas": [
                "DBP",
                "DOF",
                "Circunferencia cefálica",
                "Circunferencia abdominal",
                "Longitud femoral",
                "ILA / bolsillo mayor"
              ]
            }
          ]
        },
        {
          "id": "s_form",
          "tipo": "hallazgos",
          "titulo": "Formulario y hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_form",
              "tipo": "multitexto",
              "nombre": "Estudio y hallazgos",
              "valorDefecto": "Nombre: | Edad:\nMédico Tratante:\nFecha de nacimiento | Fecha de estudio:\nFecha de última Menstruación: | Amenorrea (semanas) | Confiable\nSi ☐No ☐\nEdad Gestacional: | Semanas | Por: Amenorra ☐\nUltrasonido Previo ☐\ndel         Trimestre | Fecha Probable de Parto:\nAntecedentes:\nIndicación:\nTipo de Estudio: | Tamizaje ☐  Dirigido ☐  Diagnóstico ☐\nEmbarazo:  ☐ Único   ☐ Múltiple\n\nCondiciones técnicas: \n☐ Buenas\n☐ Limitadas   Causas/Motivos:\n\nVía: Vaginal  ☐   Abdominal ☐\n\nLocalización de la placenta:\nRelación con el cérvix: \n ☐ No lo cubre      ☐ Lo cubre\n\nLíquido amniótico:         \n☐ Normal              ☐ Anormal\n\nMovimientos fetales:    \n☐ Normales          ☐ Anormales | ASPECTO SONOGRÁFICO DE LA ANATOMÍA FETAL\nEmbarazo:  ☐ Único   ☐ Múltiple\n\nCondiciones técnicas: \n☐ Buenas\n☐ Limitadas   Causas/Motivos:\n\nVía: Vaginal  ☐   Abdominal ☐\n\nLocalización de la placenta:\nRelación con el cérvix: \n ☐ No lo cubre      ☐ Lo cubre\n\nLíquido amniótico:         \n☐ Normal              ☐ Anormal\n\nMovimientos fetales:    \n☐ Normales          ☐ Anormales | N=Normal \nAn= Anormal* \nNV = No visualizado | N | An | NV\nEmbarazo:  ☐ Único   ☐ Múltiple\n\nCondiciones técnicas: \n☐ Buenas\n☐ Limitadas   Causas/Motivos:\n\nVía: Vaginal  ☐   Abdominal ☐\n\nLocalización de la placenta:\nRelación con el cérvix: \n ☐ No lo cubre      ☐ Lo cubre\n\nLíquido amniótico:         \n☐ Normal              ☐ Anormal\n\nMovimientos fetales:    \n☐ Normales          ☐ Anormales | Cabeza\nEmbarazo:  ☐ Único   ☐ Múltiple\n\nCondiciones técnicas: \n☐ Buenas\n☐ Limitadas   Causas/Motivos:\n\nVía: Vaginal  ☐   Abdominal ☐\n\nLocalización de la placenta:\nRelación con el cérvix: \n ☐ No lo cubre      ☐ Lo cubre\n\nLíquido amniótico:         \n☐ Normal              ☐ Anormal\n\nMovimientos fetales:    \n☐ Normales          ☐ Anormales | Forma\nEmbarazo:  ☐ Único   ☐ Múltiple\n\nCondiciones técnicas: \n☐ Buenas\n☐ Limitadas   Causas/Motivos:\n\nVía: Vaginal  ☐   Abdominal ☐\n\nLocalización de la placenta:\nRelación con el cérvix: \n ☐ No lo cubre      ☐ Lo cubre\n\nLíquido amniótico:         \n☐ Normal              ☐ Anormal\n\nMovimientos fetales:    \n☐ Normales          ☐ Anormales | Cavum SP\nEmbarazo:  ☐ Único   ☐ Múltiple\n\nCondiciones técnicas: \n☐ Buenas\n☐ Limitadas   Causas/Motivos:\n\nVía: Vaginal  ☐   Abdominal ☐\n\nLocalización de la placenta:\nRelación con el cérvix: \n ☐ No lo cubre      ☐ Lo cubre\n\nLíquido amniótico:         \n☐ Normal              ☐ Anormal\n\nMovimientos fetales:    \n☐ Normales          ☐ Anormales | Línea media\nEmbarazo:  ☐ Único   ☐ Múltiple\n\nCondiciones técnicas: \n☐ Buenas\n☐ Limitadas   Causas/Motivos:\n\nVía: Vaginal  ☐   Abdominal ☐\n\nLocalización de la placenta:\nRelación con el cérvix: \n ☐ No lo cubre      ☐ Lo cubre\n\nLíquido amniótico:         \n☐ Normal              ☐ Anormal\n\nMovimientos fetales:    \n☐ Normales          ☐ Anormales | Tálamos\nEmbarazo:  ☐ Único   ☐ Múltiple\n\nCondiciones técnicas: \n☐ Buenas\n☐ Limitadas   Causas/Motivos:\n\nVía: Vaginal  ☐   Abdominal ☐\n\nLocalización de la placenta:\nRelación con el cérvix: \n ☐ No lo cubre      ☐ Lo cubre\n\nLíquido amniótico:         \n☐ Normal              ☐ Anormal\n\nMovimientos fetales:    \n☐ Normales          ☐ Anormales | Ventrículo lateral\nEmbarazo:  ☐ Único   ☐ Múltiple\n\nCondiciones técnicas: \n☐ Buenas\n☐ Limitadas   Causas/Motivos:\n\nVía: Vaginal  ☐   Abdominal ☐\n\nLocalización de la placenta:\nRelación con el cérvix: \n ☐ No lo cubre      ☐ Lo cubre\n\nLíquido amniótico:         \n☐ Normal              ☐ Anormal\n\nMovimientos fetales:    \n☐ Normales          ☐ Anormales | Cisura de Silvio\nEmbarazo:  ☐ Único   ☐ Múltiple\n\nCondiciones técnicas: \n☐ Buenas\n☐ Limitadas   Causas/Motivos:\n\nVía: Vaginal  ☐   Abdominal ☐\n\nLocalización de la placenta:\nRelación con el cérvix: \n ☐ No lo cubre      ☐ Lo cubre\n\nLíquido amniótico:         \n☐ Normal              ☐ Anormal\n\nMovimientos fetales:    \n☐ Normales          ☐ Anormales | Cerebelo\nEmbarazo:  ☐ Único   ☐ Múltiple\n\nCondiciones técnicas: \n☐ Buenas\n☐ Limitadas   Causas/Motivos:\n\nVía: Vaginal  ☐   Abdominal ☐\n\nLocalización de la placenta:\nRelación con el cérvix: \n ☐ No lo cubre      ☐ Lo cubre\n\nLíquido amniótico:         \n☐ Normal              ☐ Anormal\n\nMovimientos fetales:    \n☐ Normales          ☐ Anormales | Cisterna Magna\nPliegue Nucal\nEmbarazo:  ☐ Único   ☐ Múltiple\n\nCondiciones técnicas: \n☐ Buenas\n☐ Limitadas   Causas/Motivos:\n\nVía: Vaginal  ☐   Abdominal ☐\n\nLocalización de la placenta:\nRelación con el cérvix: \n ☐ No lo cubre      ☐ Lo cubre\n\nLíquido amniótico:         \n☐ Normal              ☐ Anormal\n\nMovimientos fetales:    \n☐ Normales          ☐ Anormales | Cara\nLabio superior\nPerfil\nÓrbitas\nMedidas | Mm | Semanas | Nariz\nDiámetro biparietal | Narinas\nCircunferencia Cefálica | Cuello\nCircunferencia Abdominal | Tórax\nLongitud del Fémur | Pulmones\nLongitud del Húmero | Corazón\nCerebelo | Frecuencia cardiaca\nVentrículo lateral | N | An | NV | Tamaño\nCisterna Magna | N | An | NV | Eje cardiaco\nPliegue Nucal | N | An | NV | Cuatro cámaras\nEDAD GESTACIONAL: | Salida del ventrículo Izquierdo\nPeso Fetal Estimado: | Salida del ventrículo derecho\n3 vasos + Tráquea\nAbdomen\nCérvix___________mm | Estómago\nIntestino\nRiñones\nVejiga\nEntrada del cordón\nVasos del cordón\nColumna vertebral\nExtremidades\nBrazo derecho (Incluida Mano)\nPierna derecha (Incluido pie)\nBrazo izquierdo (Incluida Mano)\nPierna izquierda (Incluido pie)\nCONCLUSIONES: | Fetometría compatible con Amenorrea\nNo se identificaron alteraciones estructurales ni marcadores ecográficos de cromosomopatía.\n☐  Se anexa comentario.\nDIAGNÓSTICO\nCOMENTARIOS:\nMédico Examinador:\nCédula Profesional:\nFirma:\nInstrucciones: Ingrese en los siguientes recuadros la imagen correspondiente del Obstétrico 2º Trimestre.\nNota: El recuadro se ajustará al tamaño de la imagen que inserte.\nCorte transtalámico con medición de la circunferencia cefálica\nCorte transversal del abdomen con medición de la circunferencia abdominal.\nCorte sagital de fémur, con su medición.\nImagen de Cuatro Cámaras Cardiacas\nImagen de Tres grandes Vasos\nImagen de cérvix por vía vaginal, con su medición.\nEn caso de detectar alguna patología especifica, agregue imágenes que la represente."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ]
    }
  },
  {
    "nombre": "USG Obstétrico 3Trimestre.",
    "tipo": "Obstétrico",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_med",
          "tipo": "hallazgos",
          "titulo": "Biometría fetal",
          "columnas": 1,
          "campos": [
            {
              "id": "c_med",
              "tipo": "tabla",
              "nombre": "Biometría",
              "columnas": [
                "Medida (mm)",
                "Percentil",
                "Comentario"
              ],
              "filas": [
                "DBP",
                "DOF",
                "Circunferencia cefálica",
                "Circunferencia abdominal",
                "Longitud femoral",
                "ILA / bolsillo mayor"
              ]
            }
          ]
        },
        {
          "id": "s_form",
          "tipo": "hallazgos",
          "titulo": "Formulario y hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_form",
              "tipo": "multitexto",
              "nombre": "Estudio y hallazgos",
              "valorDefecto": "Instrucciones generales: Realice una exploración ecográfica obstétrica, del 3º trimestre de la gestación obteniendo los datos de fetometría, el cálculo del peso fetal y la valoración hemodinámica.\n​​Complete el siguiente formato de exploración con los datos obtenidos: Obstétrico 3º Trimestre.\nNombre: | Edad:\nMédico Tratante:\nFecha de nacimiento | Fecha de estudio:\nFecha de última Menstruación: | Amenorrea (semanas) | Confiable\nSi ☐No ☐\nEdad Gestacional: | Semanas | Por: Amenorra ☐\nUltrasonido Previo ☐\ndel         Trimestre | Fecha Probable de Parto:\nAntecedentes:\nIndicación:\nTipo de Estudio: | Tamizaje ☐  Dirigido ☐  Diagnóstico ☐\nEmbarazo:   ☐ Único   ☐ Múltiple\n\nCondiciones técnicas:\n ☐ Buenas\n ☐ Limitadas  Causas/Motivos:\n\nVía: Vaginal ☐     Abdominal ☐\n\nLocalización de la placenta: \nRelación con el cérvix:  \n☐ No lo cubre    ☐ Lo cubre\n\nLíquido amniótico:   ☐ Normal ☐ Anormal\nBolsillo Mayor (mm): \n\nMovimientos fetales:\n☐ Normales         ☐ Anormales\n\nPresentación Fetal: | ASPECTO SONOGRÁFICO DE LA ANATOMÍA FETAL\nEmbarazo:   ☐ Único   ☐ Múltiple\n\nCondiciones técnicas:\n ☐ Buenas\n ☐ Limitadas  Causas/Motivos:\n\nVía: Vaginal ☐     Abdominal ☐\n\nLocalización de la placenta: \nRelación con el cérvix:  \n☐ No lo cubre    ☐ Lo cubre\n\nLíquido amniótico:   ☐ Normal ☐ Anormal\nBolsillo Mayor (mm): \n\nMovimientos fetales:\n☐ Normales         ☐ Anormales\n\nPresentación Fetal: | N=Normal \nAn= Anormal* \nNV = No visualizado | N | An | NV\nEmbarazo:   ☐ Único   ☐ Múltiple\n\nCondiciones técnicas:\n ☐ Buenas\n ☐ Limitadas  Causas/Motivos:\n\nVía: Vaginal ☐     Abdominal ☐\n\nLocalización de la placenta: \nRelación con el cérvix:  \n☐ No lo cubre    ☐ Lo cubre\n\nLíquido amniótico:   ☐ Normal ☐ Anormal\nBolsillo Mayor (mm): \n\nMovimientos fetales:\n☐ Normales         ☐ Anormales\n\nPresentación Fetal: | Cabeza\nEmbarazo:   ☐ Único   ☐ Múltiple\n\nCondiciones técnicas:\n ☐ Buenas\n ☐ Limitadas  Causas/Motivos:\n\nVía: Vaginal ☐     Abdominal ☐\n\nLocalización de la placenta: \nRelación con el cérvix:  \n☐ No lo cubre    ☐ Lo cubre\n\nLíquido amniótico:   ☐ Normal ☐ Anormal\nBolsillo Mayor (mm): \n\nMovimientos fetales:\n☐ Normales         ☐ Anormales\n\nPresentación Fetal: | Forma\nEmbarazo:   ☐ Único   ☐ Múltiple\n\nCondiciones técnicas:\n ☐ Buenas\n ☐ Limitadas  Causas/Motivos:\n\nVía: Vaginal ☐     Abdominal ☐\n\nLocalización de la placenta: \nRelación con el cérvix:  \n☐ No lo cubre    ☐ Lo cubre\n\nLíquido amniótico:   ☐ Normal ☐ Anormal\nBolsillo Mayor (mm): \n\nMovimientos fetales:\n☐ Normales         ☐ Anormales\n\nPresentación Fetal: | Cavum SP\nEmbarazo:   ☐ Único   ☐ Múltiple\n\nCondiciones técnicas:\n ☐ Buenas\n ☐ Limitadas  Causas/Motivos:\n\nVía: Vaginal ☐     Abdominal ☐\n\nLocalización de la placenta: \nRelación con el cérvix:  \n☐ No lo cubre    ☐ Lo cubre\n\nLíquido amniótico:   ☐ Normal ☐ Anormal\nBolsillo Mayor (mm): \n\nMovimientos fetales:\n☐ Normales         ☐ Anormales\n\nPresentación Fetal: | Línea media\nEmbarazo:   ☐ Único   ☐ Múltiple\n\nCondiciones técnicas:\n ☐ Buenas\n ☐ Limitadas  Causas/Motivos:\n\nVía: Vaginal ☐     Abdominal ☐\n\nLocalización de la placenta: \nRelación con el cérvix:  \n☐ No lo cubre    ☐ Lo cubre\n\nLíquido amniótico:   ☐ Normal ☐ Anormal\nBolsillo Mayor (mm): \n\nMovimientos fetales:\n☐ Normales         ☐ Anormales\n\nPresentación Fetal: | Tálamos\nEmbarazo:   ☐ Único   ☐ Múltiple\n\nCondiciones técnicas:\n ☐ Buenas\n ☐ Limitadas  Causas/Motivos:\n\nVía: Vaginal ☐     Abdominal ☐\n\nLocalización de la placenta: \nRelación con el cérvix:  \n☐ No lo cubre    ☐ Lo cubre\n\nLíquido amniótico:   ☐ Normal ☐ Anormal\nBolsillo Mayor (mm): \n\nMovimientos fetales:\n☐ Normales         ☐ Anormales\n\nPresentación Fetal: | Ventrículo lateral\nEmbarazo:   ☐ Único   ☐ Múltiple\n\nCondiciones técnicas:\n ☐ Buenas\n ☐ Limitadas  Causas/Motivos:\n\nVía: Vaginal ☐     Abdominal ☐\n\nLocalización de la placenta: \nRelación con el cérvix:  \n☐ No lo cubre    ☐ Lo cubre\n\nLíquido amniótico:   ☐ Normal ☐ Anormal\nBolsillo Mayor (mm): \n\nMovimientos fetales:\n☐ Normales         ☐ Anormales\n\nPresentación Fetal: | Cisura de Silvio\nEmbarazo:   ☐ Único   ☐ Múltiple\n\nCondiciones técnicas:\n ☐ Buenas\n ☐ Limitadas  Causas/Motivos:\n\nVía: Vaginal ☐     Abdominal ☐\n\nLocalización de la placenta: \nRelación con el cérvix:  \n☐ No lo cubre    ☐ Lo cubre\n\nLíquido amniótico:   ☐ Normal ☐ Anormal\nBolsillo Mayor (mm): \n\nMovimientos fetales:\n☐ Normales         ☐ Anormales\n\nPresentación Fetal: | Cerebelo\nEmbarazo:   ☐ Único   ☐ Múltiple\n\nCondiciones técnicas:\n ☐ Buenas\n ☐ Limitadas  Causas/Motivos:\n\nVía: Vaginal ☐     Abdominal ☐\n\nLocalización de la placenta: \nRelación con el cérvix:  \n☐ No lo cubre    ☐ Lo cubre\n\nLíquido amniótico:   ☐ Normal ☐ Anormal\nBolsillo Mayor (mm): \n\nMovimientos fetales:\n☐ Normales         ☐ Anormales\n\nPresentación Fetal: | Cisterna Magna\nEmbarazo:   ☐ Único   ☐ Múltiple\n\nCondiciones técnicas:\n ☐ Buenas\n ☐ Limitadas  Causas/Motivos:\n\nVía: Vaginal ☐     Abdominal ☐\n\nLocalización de la placenta: \nRelación con el cérvix:  \n☐ No lo cubre    ☐ Lo cubre\n\nLíquido amniótico:   ☐ Normal ☐ Anormal\nBolsillo Mayor (mm): \n\nMovimientos fetales:\n☐ Normales         ☐ Anormales\n\nPresentación Fetal: | Cara\nEmbarazo:   ☐ Único   ☐ Múltiple\n\nCondiciones técnicas:\n ☐ Buenas\n ☐ Limitadas  Causas/Motivos:\n\nVía: Vaginal ☐     Abdominal ☐\n\nLocalización de la placenta: \nRelación con el cérvix:  \n☐ No lo cubre    ☐ Lo cubre\n\nLíquido amniótico:   ☐ Normal ☐ Anormal\nBolsillo Mayor (mm): \n\nMovimientos fetales:\n☐ Normales         ☐ Anormales\n\nPresentación Fetal: | Labio superior\nPerfil\nÓrbitas\nFetometría | Mm | Semanas | Nariz\nDiámetro biparietal | Narinas\nCircunferencia Cefálica | Cuello\nCircunferencia Abdominal | Tórax\nLongitud del Fémur | Corazón\nLongitud del Húmero | Frecuencia cardiaca\nLongitud de tibia | Tamaño\nEdad Gestacional | Eje cardiaco\nPeso Fetal Estimado: | % | Cuatro cámaras\nComentario: | Salida del ventrículo Izquierdo\nFLUJOMETRIA | IP | N | An | NV | Salida del ventrículo derecho\nArteria Umbilical | 3 vasos + Tráquea\nArteria Cerebral Media | Abdomen\nÍndice Cerebro-Placentario | Estómago\nDuctus Venoso | Intestino\nArteria Uterina | Riñones\nVejiga\nInserción del cordón\nVasos del cordón\nColumna vertebral\nExtremidades\nBrazo derecho (Incluida Mano)\nPierna derecha (Incluido pie)\nBrazo izquierdo (Incluida Mano)\nPierna izquierda (Incluido pie)\nCONCLUSIONES: | Fetometría compatible con Edad Gestacional\nCrecimiento armónico y proporcionado\nFlujometría Normal\nLíquido amniótico normal\nVer comentarios anexos\nDIAGNÓSTICO\nCOMENTARIOS:\nMédico Examinador:\nCédula Profesional:\nFirma:\nInstrucciones: Ingrese en los siguientes recuadros la imagen correspondiente de una exploración ecográfica obstétrica, del 3º trimestre.\nNota: El recuadro se ajustará al tamaño de la imagen que inserte.\nCorte transtalámico con medición de la circunferencia cefálica.\nCorte transversal del abdomen con medición de la circunferencia abdominal.\nCorte sagital de fémur, con su medición\nImagen de Onda de Velocidad de Flujo de Arteria Umbilical.\nImagen de Onda de Velocidad de Flujo de Arteria Cerebral Media.\nImagen del bolsillo mayor de líquido amniótico.\nEn caso de detectar alguna patología especifica, agregue imágenes que la represente."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ]
    }
  },
  {
    "nombre": "Ultrasonido pélvico.2023",
    "tipo": "Abdominal",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_med",
          "tipo": "hallazgos",
          "titulo": "Mediciones",
          "columnas": 1,
          "campos": [
            {
              "id": "c_med",
              "tipo": "tabla",
              "nombre": "Mediciones",
              "columnas": [
                "Longitudinal (mm)",
                "AP (mm)",
                "Transverso (mm)",
                "Volumen (cc)"
              ],
              "filas": [
                "Útero",
                "Endometrio",
                "Ovario derecho",
                "Ovario izquierdo"
              ]
            }
          ]
        },
        {
          "id": "s_form",
          "tipo": "hallazgos",
          "titulo": "Formulario y hallazgos",
          "columnas": 1,
          "campos": [
            {
              "id": "c_form",
              "tipo": "multitexto",
              "nombre": "Estudio y hallazgos",
              "valorDefecto": "Instrucciones: Realiza una exploración ecográfica pélvica, preferentemente vía vaginal. Complementa el siguiente formato e incluye las imágenes obligatorias solicitadas por su instructor que se encuentran en la parte inferior.\nNombre: | Edad:\nMédico Tratante:\nFecha de nacimiento | Fecha de estudio:\nFecha de última Menstruación: | Amenorrea (semanas) | Confiable\nSi ☐No ☐\nAntecedentes:\nCuadro Clínico:\nIndicación:\nTipo de Estudio: | Tamizaje ☐ Dirigido ☐ Diagnóstico ☐\nVIA:   Abdominal ☐      Vaginal ☐\nVISUALIZACIÓN:  Adecuada ☐   Limitada ☐\nComentario: ________________________________________________________________________\nÚTERO:\nAusente ☐    Presente ☐   Anteversoflexión ☐   Retroversoflexión ☐    Indiferente ☐\nContorno de la serosa: Regular ☐ Lobulada ☐\nParedes miometriales: Simétricas ☐ Asimétricas ☐\nEcogenicidad: Homogénea ☐ Heterogénea ☐\nLesiones miometriales No ☐   Sí ☐ Número _______\nSitio, diámetro mayor y descripción: Localizadas.   ☐    Difusas ☐\n__________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________\nDimensiones:\nMilímetros | Comentarios:\nDiámetro\nLongitudinal\nAnteroposterior\nTransverso\nVolumen\nEndometrio\nCérvix\nHallazgos:\nZona subendometrial: Regular ☐ Irregular ☐ Interrumpida ☐ No visibles ☐ No valorable☐\nComentario:\nEndometrio: Ecogenicidad: Uniforme ☐ No uniforme ☐\nFase: Proliferativa ☐ Secretora ☐ 3 Líneas ☐ Atrofia ☐\nLínea endometrial: Lineal ☐ No lineal ☐ Irregular ☐ No definida ☐\nLesiones intracavitarias: No ☐   Si ☐ Localizada (<25%) ☐ Extendida (>25%)\npedunculada ☐ sésil ☐; Ecogenicidad: uniforme ☐ no uniforme ☐; Superficie: regular ☐ Irregular\nLíquido intracavitario: No ☐   Si ☐   Ecogenicidad: anecoico ☐ vidrio esmerilado ☐ mixta ☐\nComentario:____________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________________\nOVARIOS:\nOVARIO DERECHO | OVARIO IZQUIERDO\nDiámetro | Milímetros\nL     Longitudinal | Longitudinal\nAn  Anteroposterior | Anteroposterior:\nTr   Transverso | Transverso\nVo  Volumen | Volumen\nNormal ☐ Lesión ☐\n D.  Descripción: | Normal ☐ Lesión ☐\nDescripción:\n\n\n\n\nD\nFondo de Saco:\nConclusiones:\nDiagnóstico\nComentario:\nMédico Examinador:\nCédula Profesional:\nFirma:\nInstrucciones: Ingrese en los siguientes recuadros la imagen correspondiente a las exploraciones ecográficas pélvicas\nNota: El recuadro se ajustará al tamaño de la imagen que inserte.\nCorte sagital de útero con sus medidas.\nCorte transversal del útero con sus medidas.\nOvario derecho (imagen dual) con sus medidas en los tres planos.\nOvario izquierdo (imagen dual) con sus medidas en los tres planos.\nImagen de endometrio en corte sagital con su medida.\nFondo de saco en sagital.\nNota: En caso de detectar alguna patología específica, agregue otras imágenes que la represente."
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ]
    }
  },
  {
    "nombre": "Doppler carotídeo",
    "tipo": "Doppler",
    "estructura": {
      "secciones": [
        {
          "id": "enc",
          "tipo": "encabezado",
          "titulo": "Datos del estudio",
          "columnas": 3,
          "campos": [
            {
              "id": "paciente",
              "tipo": "texto",
              "nombre": "Paciente"
            },
            {
              "id": "edad",
              "tipo": "numero",
              "nombre": "Edad",
              "span": 1
            },
            {
              "id": "sexo",
              "tipo": "opcion",
              "nombre": "Sexo",
              "opciones": [
                "Masculino",
                "Femenino"
              ],
              "span": 1
            },
            {
              "id": "expediente",
              "tipo": "texto",
              "nombre": "Expediente",
              "span": 1,
              "bloqueado": true
            },
            {
              "id": "fechaEstudio",
              "tipo": "fecha",
              "nombre": "Fecha del estudio",
              "span": 1
            },
            {
              "id": "solicitante",
              "tipo": "texto",
              "nombre": "Médico solicitante",
              "span": 1
            },
            {
              "id": "equipo",
              "tipo": "texto",
              "nombre": "Equipo",
              "span": 1
            },
            {
              "id": "motivo",
              "tipo": "texto",
              "nombre": "Motivo del estudio",
              "span": 99
            }
          ]
        },
        {
          "id": "s_ref",
          "tipo": "hallazgos",
          "titulo": "Referencia anatómica",
          "columnas": 1,
          "campos": [
            {
              "id": "c_ref",
              "tipo": "imagen",
              "nombre": "Diagrama de troncos supraaórticos",
              "origen": "referencia",
              "refUrl": ""
            },
            {
              "id": "c_guia",
              "tipo": "guia",
              "nombre": "Reporte los índices por vaso (ACC, ACE, ACI) de cada lado."
            }
          ]
        },
        {
          "id": "s_der",
          "tipo": "hallazgos",
          "titulo": "Doppler carotídeo derecho",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tder",
              "tipo": "tabla",
              "nombre": "Velocidades e índices (derecho)",
              "columnas": [
                "PSV (cm/s)",
                "EDV (cm/s)",
                "IR",
                "Estenosis (%)"
              ],
              "filas": [
                "ACC",
                "ACE",
                "ACI",
                "Vertebral"
              ]
            }
          ]
        },
        {
          "id": "s_izq",
          "tipo": "hallazgos",
          "titulo": "Doppler carotídeo izquierdo",
          "columnas": 1,
          "campos": [
            {
              "id": "c_tizq",
              "tipo": "tabla",
              "nombre": "Velocidades e índices (izquierdo)",
              "columnas": [
                "PSV (cm/s)",
                "EDV (cm/s)",
                "IR",
                "Estenosis (%)"
              ],
              "filas": [
                "ACC",
                "ACE",
                "ACI",
                "Vertebral"
              ]
            }
          ]
        },
        {
          "id": "s_int",
          "tipo": "hallazgos",
          "titulo": "Interpretación",
          "columnas": 1,
          "campos": [
            {
              "id": "c_int",
              "tipo": "multitexto",
              "nombre": "Hallazgos e interpretación"
            }
          ]
        },
        {
          "id": "s_gal",
          "tipo": "hallazgos",
          "titulo": "Imágenes del estudio",
          "columnas": 1,
          "campos": [
            {
              "id": "c_galeria",
              "tipo": "galeria",
              "nombre": "Imágenes del estudio"
            }
          ]
        }
      ],
      "impresionDefecto": ""
    }
  }
];
