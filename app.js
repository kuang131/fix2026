// ==========================================
// VARIABLES GLOBALES
// ==========================================
let datosFixture = null;

// ==========================================
// 1. INICIALIZACIÓN Y FASE DE LLAVES
// ==========================================
async function inicializarFixture() {
    try {
        let datosIniciales = null;
        const guardado = localStorage.getItem('fixture_llaves');
        
        if (guardado) {
            datosIniciales = JSON.parse(guardado);
        } 
        
        if (!datosIniciales || !datosIniciales.fases) {
            const respuesta = await fetch('fixture.json');
            datosIniciales = await respuesta.json();
        }
        
        datosFixture = datosIniciales;
        
        if(datosFixture && datosFixture.fases) {
            armarEstructuraLlaves();
        }

        // ¡ACÁ ESTÁ LA MAGIA QUE FALTABA!
        // Le damos arranque a la lectura del JSON en la nube
        await sincronizarConNube();

    } catch (error) {
        console.error("Error crítico cargando el Fixture:", error);
    }
}

function armarEstructuraLlaves() {
    const configuracionFases = [
        { nombre: "16vos", idIzq: "izq-16vos", idDer: "der-16vos", totalPartidos: 16 },
        { nombre: "octavos", idIzq: "izq-octavos", idDer: "der-octavos", totalPartidos: 8 },
        { nombre: "cuartos", idIzq: "izq-cuartos", idDer: "der-cuartos", totalPartidos: 4 },
        { nombre: "semis", idIzq: "izq-semis", idDer: "der-semis", totalPartidos: 2 }
    ];

    configuracionFases.forEach(fase => {
        const contenedorIzq = document.getElementById(fase.idIzq);
        const contenedorDer = document.getElementById(fase.idDer);
        let htmlIzquierda = '';
        let htmlDerecha = '';

        const partidos = datosFixture.fases[fase.nombre];
        
        if (partidos) {
            const mitad = fase.totalPartidos / 2;
            partidos.forEach((partido, indice) => {
                const tarjetaHtml = crearTarjetaPartido(partido);
                if (indice < mitad) {
                    htmlIzquierda += tarjetaHtml;
                } else {
                    htmlDerecha += tarjetaHtml;
                }
            });
        }

        if(contenedorIzq) contenedorIzq.innerHTML = htmlIzquierda;
        if(contenedorDer) contenedorDer.innerHTML = htmlDerecha;
    });

// === INYECTOR: PARTIDO POR EL 3ER PUESTO ===
    const contenedorTercero = document.getElementById('centro-tercer-puesto');
    if (contenedorTercero) {
        const semis = datosFixture.fases["semis"];
        let eq1 = { nombre: "", codigo: null, goles: null };
        let eq2 = { nombre: "", codigo: null, goles: null };

        // Si se jugaron las semis, pescamos a los dos perdedores
        if (semis && semis.length === 2 && semis[0].equipo_local.goles !== null && semis[1].equipo_local.goles !== null) {
            eq1 = (semis[0].equipo_local.goles > semis[0].equipo_visitante.goles || semis[0].equipo_local.penales > semis[0].equipo_visitante.penales) ? semis[0].equipo_visitante : semis[0].equipo_local;
            eq2 = (semis[1].equipo_local.goles > semis[1].equipo_visitante.goles || semis[1].equipo_local.penales > semis[1].equipo_visitante.penales) ? semis[1].equipo_visitante : semis[1].equipo_local;
        }

        // Lo creamos o actualizamos
        if (!datosFixture.fases["tercero"]) {
            datosFixture.fases["tercero"] = [{ id: "partido-tercero", equipo_local: { ...eq1 }, equipo_visitante: { ...eq2 }, fecha: "18 Jul", hora: "17:00 hs" }];
        } else {
            const part = datosFixture.fases["tercero"][0];
            // Si el usuario modificó las semis, reseteamos este partido
            if (part.equipo_local.codigo !== eq1.codigo || part.equipo_visitante.codigo !== eq2.codigo) {
                part.equipo_local = { ...eq1, goles: null };
                part.equipo_visitante = { ...eq2, goles: null };
            }
        }
        
        // Lo imprimimos en pantalla
        if (eq1.codigo && eq2.codigo) {
            contenedorTercero.innerHTML = `<div style="color:#cd7f32; font-size:12px; font-weight:bold; margin-bottom:5px; text-shadow: 0 1px 2px rgba(0,0,0,0.8); letter-spacing: 1px;">🥉 3ER PUESTO</div>` + crearTarjetaPartido(datosFixture.fases["tercero"][0]);
        } else {
            contenedorTercero.innerHTML = '';
        }
    }

    actualizarPodio();
} // <-- FIN DE armarEstructuraLlaves()

function actualizarPodio() {
    const podio = document.getElementById('podio-campeones');
    if (!podio) return;

    const finalMatch = datosFixture.fases["final"][0];
    
    if (!finalMatch || finalMatch.equipo_local.goles === null || finalMatch.equipo_visitante.goles === null || !finalMatch.equipo_local.codigo || !finalMatch.equipo_visitante.codigo) {
        podio.style.display = 'none';
        return;
    }

    let campeon, subcampeon;
    const eqL = finalMatch.equipo_local;
    const eqV = finalMatch.equipo_visitante;

    if (eqL.goles > eqV.goles || (eqL.penales > eqV.penales)) {
        campeon = eqL; subcampeon = eqV;
    } else {
        campeon = eqV; subcampeon = eqL;
    }

    document.getElementById('campeon-bandera').src = `banderas/${campeon.codigo}.png`;
    document.getElementById('campeon-nombre').innerText = campeon.nombre;
    document.getElementById('segundo-bandera').src = `banderas/${subcampeon.codigo}.png`;
    document.getElementById('segundo-nombre').innerText = subcampeon.nombre;

    // AHORA BUSCAMOS AL VERDADERO GANADOR DEL BRONCE
    const partidoTercero = datosFixture.fases["tercero"] ? datosFixture.fases["tercero"][0] : null;
    let terceroReal = null;
    
    if (partidoTercero && partidoTercero.equipo_local.goles !== null && partidoTercero.equipo_visitante.goles !== null) {
        terceroReal = (partidoTercero.equipo_local.goles > partidoTercero.equipo_visitante.goles || partidoTercero.equipo_local.penales > partidoTercero.equipo_visitante.penales) ? partidoTercero.equipo_local : partidoTercero.equipo_visitante;
    }

    const divTercero = document.getElementById('tercero-info');
    if (terceroReal && terceroReal.codigo) {
        divTercero.innerHTML = `<span style="color: #cd7f32;">🥉 3ro:</span> <img src="banderas/${terceroReal.codigo}.png" style="width: 20px; height: 14px; border-radius: 2px;"> <span style="color: white;">${terceroReal.nombre}</span>`;
        divTercero.style.display = 'flex';
    } else {
        divTercero.style.display = 'none'; // Si no jugaron, ocultamos el 3er puesto del podio
    }

    podio.style.display = 'flex';
}

function crearTarjetaPartido(partido) {
    const eqL = partido.equipo_local || { origen: 'A definir', codigo: null };
    const eqV = partido.equipo_visitante || { origen: 'A definir', codigo: null };

    // EL TRADUCTOR VISUAL: Disfraza los códigos internos para que se vean unificados
    function textoUnificado(origen) {
        if (!origen) return 'A conf.';
        return origen
            .replace('Gan P', 'Gan 1/16 - ')
            .replace('Gan O', 'Gan 1/8 - ')
            .replace('Gan C', 'Gan 1/4 - ')
            .replace('Gan S', 'Gan 1/2 - ');
    }

    const origenL = textoUnificado(eqL.origen);
    const origenV = textoUnificado(eqV.origen);

    const golesLHtml = (eqL.goles !== null && eqL.goles !== undefined) ? eqL.goles : '-';
    const golesVHtml = (eqV.goles !== null && eqV.goles !== undefined) ? eqV.goles : '-';

    // Agregamos los penales al lado de los goles si es que hubo
    const pl = (eqL.penales !== undefined && eqL.penales !== null) ? ` <span style="color:#eab308;font-size:10px">(${eqL.penales})</span>` : '';
    const pv = (eqV.penales !== undefined && eqV.penales !== null) ? ` <span style="color:#eab308;font-size:10px">(${eqV.penales})</span>` : '';

    const htmlLocal = eqL.codigo
        ? `<div class="equipo-llave"><img src="banderas/${eqL.codigo}.png" class="icono-bandera"> <span class="nombre-pais">${eqL.nombre}</span> <span class="goles">${golesLHtml}${pl}</span></div>`
        : `<div class="equipo-llave origen-pendiente">${origenL}</div>`;

    const htmlVisita = eqV.codigo
        ? `<div class="equipo-llave"><img src="banderas/${eqV.codigo}.png" class="icono-bandera"> <span class="nombre-pais">${eqV.nombre}</span> <span class="goles">${golesVHtml}${pv}</span></div>`
        : `<div class="equipo-llave origen-pendiente">${origenV}</div>`;

    let textoCaja = '-';
    if (partido.id.startsWith('P')) textoCaja = '1/16';
    else if (partido.id.startsWith('O')) textoCaja = '1/8';
    else if (partido.id.startsWith('C')) textoCaja = '1/4';
    else if (partido.id.startsWith('S')) textoCaja = '1/2';
    else if (partido.id.startsWith('F')) textoCaja = '🏆';

    return `
    <div class="tarjeta-partido" id="tarjeta-${partido.id}" data-id="${partido.id}">
        <div class="origen-cruce" style="background-color: #334155; color: white;">${textoCaja}</div>
        <div class="detalle-partido">
            <div class="fecha-hora">${partido.fecha || 'A conf.'} - ${partido.hora || 'A conf.'}</div>
            ${htmlLocal}
            ${htmlVisita}
        </div>
    </div>
    `;
}

// ==========================================
// 2. DIBUJO DE LÍNEAS SVG
// ==========================================
function dibujarConectores() {
    const contenedor = document.getElementById('pantalla-llaves');
    let svg = document.getElementById('svg-conectores');
    
    if (!svg) {
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.id = 'svg-conectores';
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '0'; 
        contenedor.appendChild(svg);
    }
    
    svg.innerHTML = ''; 

    const colorLinea = 'rgba(255, 255, 255, 0.15)'; 
    const grosor = 2;
    const rectContenedor = contenedor.getBoundingClientRect();

    function crearLinea(x1, y1, x2, y2) {
        const linea = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const xMitad = x1 + (x2 - x1) / 2;
        const d = `M ${x1} ${y1} H ${xMitad} V ${y2} H ${x2}`;
        linea.setAttribute("d", d);
        linea.setAttribute("stroke", colorLinea);
        linea.setAttribute("stroke-width", grosor);
        linea.setAttribute("fill", "none");
        svg.appendChild(linea);
    }

    function conectarColumnas(idOrigen, idDestino, lado) {
        const colOrigen = document.getElementById(idOrigen);
        const colDestino = document.getElementById(idDestino);
        if (!colOrigen || !colDestino) return;

        const tarjetasOrig = colOrigen.querySelectorAll('.tarjeta-partido');
        const tarjetasDest = colDestino.querySelectorAll('.tarjeta-partido');

        tarjetasDest.forEach((tDest, i) => {
            const rectDest = tDest.getBoundingClientRect();
            const yDest = rectDest.top + rectDest.height / 2 - rectContenedor.top;
            const xDest = lado === 'izq' ? rectDest.left - rectContenedor.left : rectDest.right - rectContenedor.left;

            for(let j = 0; j < 2; j++) {
                const tOrig = tarjetasOrig[i * 2 + j];
                if (tOrig) {
                    const rectOrig = tOrig.getBoundingClientRect();
                    const yOrig = rectOrig.top + rectOrig.height / 2 - rectContenedor.top;
                    const xOrig = lado === 'izq' ? rectOrig.right - rectContenedor.left : rectOrig.left - rectContenedor.left;
                    
                    crearLinea(xOrig, yOrig, xDest, yDest);
                }
            }
        });
    }

    conectarColumnas('izq-16vos', 'izq-octavos', 'izq');
    conectarColumnas('izq-octavos', 'izq-cuartos', 'izq');
    conectarColumnas('izq-cuartos', 'izq-semis', 'izq');
    
    conectarColumnas('der-16vos', 'der-octavos', 'der');
    conectarColumnas('der-octavos', 'der-cuartos', 'der');
    conectarColumnas('der-cuartos', 'der-semis', 'der');

    setTimeout(() => {
        const svgElement = document.getElementById('svg-conectores');
        const final = document.querySelector('.columna-central .tarjeta-partido');
        const semiIzq = document.querySelector('.izquierdo .col-semis .tarjeta-partido');
        const semiDer = document.querySelector('.derecho .col-semis .tarjeta-partido');

        if (svgElement && final && semiIzq && semiDer) {
            const rectSvg = svgElement.getBoundingClientRect();
            const rF = final.getBoundingClientRect();
            const rSI = semiIzq.getBoundingClientRect();
            const rSD = semiDer.getBoundingClientRect();

            const x1 = rSI.right - rectSvg.left;
            const y1 = rSI.top + (rSI.height / 2) - rectSvg.top;
            
            const x2 = rSD.left - rectSvg.left;
            const y2 = rSD.top + (rSD.height / 2) - rectSvg.top;
            
            const x3 = rF.left + (rF.width / 2) - rectSvg.left;
            const y3 = rF.top - rectSvg.top;

            Array.from(svgElement.querySelectorAll('path')).forEach(path => {
                const box = path.getBoundingClientRect();
                if (box.right > rF.left && box.left < rF.right) {
                    path.remove(); 
                }
            });

            const pathStr = `M ${x1} ${y1} L ${x2} ${y1} M ${x3} ${y1} L ${x3} ${y3}`;
            const pathT = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathT.setAttribute('d', pathStr);
            pathT.setAttribute('stroke', 'rgba(255, 255, 255, 0.2)'); 
            pathT.setAttribute('stroke-width', '2');
            pathT.setAttribute('fill', 'none');
            svgElement.appendChild(pathT);
        }
    }, 50);
}

window.addEventListener('resize', () => {
    if (document.getElementById('pantalla-llaves').style.display === 'flex') {
        dibujarConectores();
    }
});

// ==========================================
// 3. LÓGICA DINÁMICA DE LA VENTANA MODAL GRUPOS
// ==========================================
const modal = document.getElementById('modal-grupo');
const btnCerrar = document.getElementById('btn-cerrar-modal');

let equiposGrupoActual = [];
let partidosGrupoActual = [];

function abrirModalGrupo(tarjeta) {
    const letraGrupo = tarjeta.querySelector('.letra-grupo').innerText;
    document.getElementById('modal-titulo-grupo').innerText = `GRUPO ${letraGrupo}`;

    equiposGrupoActual = [];
    const divEquipos = tarjeta.querySelectorAll('.equipo');
    divEquipos.forEach(div => {
        const img = div.querySelector('img').src;
        const sigla = div.querySelector('img').getAttribute('alt'); 
        equiposGrupoActual.push({
            nombre: sigla,
            bandera: img,
            pts: 0, pj: 0, gf: 0, gc: 0, dg: 0
        });
    });

    const guardado = localStorage.getItem(`grupo_${letraGrupo}`);
    if (guardado) {
        partidosGrupoActual = JSON.parse(guardado);
    } else {
        partidosGrupoActual = [
            { local: 0, visita: 1, gl: null, gv: null },
            { local: 2, visita: 3, gl: null, gv: null },
            { local: 0, visita: 2, gl: null, gv: null },
            { local: 1, visita: 3, gl: null, gv: null },
            { local: 0, visita: 3, gl: null, gv: null },
            { local: 1, visita: 2, gl: null, gv: null } 
        ];
    }

    dibujarPartidosModal();
    recalcularTabla();
    document.querySelector('#modal-grupo .btn-guardar').style.display = 'none';
    modal.style.display = 'flex';
}

function dibujarPartidosModal() {
    const contenedor = document.getElementById('lista-partidos-grupo');
    contenedor.innerHTML = '';

    partidosGrupoActual.forEach((partido) => {
        const eqL = equiposGrupoActual[partido.local];
        const eqV = equiposGrupoActual[partido.visita];
        
        // Goles de solo lectura (si es null, pone un guion)
        const golL = partido.gl !== null ? partido.gl : '-';
        const golV = partido.gv !== null ? partido.gv : '-';

        const fechaStr = partido.fecha ? partido.fecha : 'A conf.';
        const horaStr = partido.hora ? partido.hora : 'A conf.';

        contenedor.innerHTML += `
            <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 15px; background: rgba(255,255,255,0.02); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="font-size: 10px; color: #a0aab5; font-weight: bold; letter-spacing: 1px; margin-bottom: 8px;">
                    ${fechaStr} - ${horaStr}
                </div>
                <div class="fila-carga-partido" style="margin-bottom: 0;">
                  <div class="equipo-carga derecha">${eqL.nombre} <img src="${eqL.bandera}" class="icono-bandera"></div>
                  <div style="width: 35px; text-align: center; font-size: 18px; font-weight: bold; color: white; background: #0b0e14; border-radius: 4px; padding: 4px 0;">${golL}</div>
                  <span class="vs" style="margin: 0 10px;">-</span>
                  <div style="width: 35px; text-align: center; font-size: 18px; font-weight: bold; color: white; background: #0b0e14; border-radius: 4px; padding: 4px 0;">${golV}</div>
                  <div class="equipo-carga izquierda"><img src="${eqV.bandera}" class="icono-bandera"> ${eqV.nombre}</div>
                </div>
            </div>
        `;
    });
}

function recalcularTabla() {
    equiposGrupoActual.forEach(eq => { eq.pts = 0; eq.pj = 0; eq.gf = 0; eq.gc = 0; eq.dg = 0; });

    partidosGrupoActual.forEach(p => {
        if (p.gl !== null && p.gv !== null) {
            const eqL = equiposGrupoActual[p.local];
            const eqV = equiposGrupoActual[p.visita];

            eqL.pj++; eqV.pj++;
            eqL.gf += p.gl; eqV.gf += p.gv;
            eqL.gc += p.gv; eqV.gc += p.gl;
            
            if (p.gl > p.gv) { eqL.pts += 3; }
            else if (p.gl < p.gv) { eqV.pts += 3; }
            else { eqL.pts += 1; eqV.pts += 1; }
        }
    });

    equiposGrupoActual.forEach(eq => eq.dg = eq.gf - eq.gc);

    const tablaOrdenada = [...equiposGrupoActual].sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.dg !== a.dg) return b.dg - a.dg;
        return b.gf - a.gf;
    });

    const tbody = document.getElementById('tabla-cuerpo');
    tbody.innerHTML = '';
    tablaOrdenada.forEach((eq, idx) => {
        let clasePos = idx === 0 ? 'pos-1' : (idx === 1 ? 'pos-2' : 'pos-resto');
        tbody.innerHTML += `
          <tr>
            <td class="col-equipo"><span class="pos-circulo ${clasePos}">${idx + 1}</span> <img src="${eq.bandera}" class="icono-bandera"> ${eq.nombre}</td>
            <td class="destacado">${eq.pts}</td><td>${eq.pj}</td><td>${eq.gf}</td><td>${eq.gc}</td><td>${eq.dg}</td>
          </tr>
        `;
    });
}

document.querySelectorAll('.tarjeta-grupo').forEach(tarjeta => {
    tarjeta.addEventListener('click', (e) => {
        e.stopPropagation(); 
        abrirModalGrupo(tarjeta);
    });
});

btnCerrar.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; }


// ==========================================
// 4. EDITOR DE LLAVES (EL CEREBRO + PENALES)
// ==========================================
const modalPartido = document.getElementById('modal-partido');
const btnCerrarPartido = document.getElementById('btn-cerrar-partido');
const btnGuardarLlave = document.getElementById('btn-guardar-llave');
const btnResetLlave = document.getElementById('btn-reset-llave'); // <-- NUEVO BOTÓN
let partidoEditando = null;

document.body.addEventListener('click', (e) => {
    const tarjeta = e.target.closest('.tarjeta-partido'); 
    if (tarjeta && document.getElementById('pantalla-llaves').style.display === 'flex') {
        const idPartido = tarjeta.getAttribute('data-id');
        abrirModalLlave(idPartido);
    }
});

function abrirModalLlave(idPartido) {
    for (const fase in datosFixture.fases) {
		if (["16vos", "octavos", "cuartos", "semis", "final", "tercero"].includes(fase)) {
            const encontrado = datosFixture.fases[fase].find(p => p.id === idPartido);
            if (encontrado) {
                partidoEditando = encontrado;
                break;
            }
        }
    }

    if (!partidoEditando || !partidoEditando.equipo_local.codigo || !partidoEditando.equipo_visitante.codigo) return;

    const eqL = partidoEditando.equipo_local;
    const eqV = partidoEditando.equipo_visitante;
    const cont = document.getElementById('contenedor-carga-llave');
    
    const mostrarPenales = (eqL.goles !== null && eqL.goles === eqV.goles) ? 'flex' : 'none';
    const pl = (eqL.penales !== undefined && eqL.penales !== null) ? eqL.penales : '';
    const pv = (eqV.penales !== undefined && eqV.penales !== null) ? eqV.penales : '';

    // Solo mostramos el botón rojo de la basurita si el partido ya tenía un resultado previo
    if (btnResetLlave) {
        btnResetLlave.style.display = (eqL.goles !== null && eqV.goles !== null) ? 'block' : 'none';
    }

    cont.innerHTML = `
        <div class="fila-carga-partido" style="margin: 20px 0; align-items: center;">
            <div class="equipo-carga derecha" style="width: 130px; font-size: 16px;">
                ${eqL.nombre} <img src="banderas/${eqL.codigo}.png" class="icono-bandera" style="width: 30px; height: 20px;">
            </div>
            
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <div style="display: flex; align-items: center;">
                    <input type="number" id="goles-local-llave" class="input-goles" min="0" value="${eqL.goles !== null ? eqL.goles : ''}" style="width: 45px; height: 40px; font-size: 20px;">
                    <span class="vs" style="margin: 0 10px;">-</span>
                    <input type="number" id="goles-visita-llave" class="input-goles" min="0" value="${eqV.goles !== null ? eqV.goles : ''}" style="width: 45px; height: 40px; font-size: 20px;">
                </div>
                
                <div id="contenedor-penales" style="display: ${mostrarPenales}; align-items: center; gap: 5px; background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 5px; border: 1px solid rgba(234, 179, 8, 0.3);">
                    <span style="font-size: 9px; color: #eab308; font-weight: bold; margin-right: 5px;">PENALES</span>
                    <input type="number" id="penales-local" class="input-goles" min="0" value="${pl}" style="width: 30px; height: 25px; font-size: 14px; border-color: #eab308;">
                    <span class="vs" style="font-size: 12px; margin: 0;">-</span>
                    <input type="number" id="penales-visita" class="input-goles" min="0" value="${pv}" style="width: 30px; height: 25px; font-size: 14px; border-color: #eab308;">
                </div>
            </div>

            <div class="equipo-carga izquierda" style="width: 130px; font-size: 16px;">
                <img src="banderas/${eqV.codigo}.png" class="icono-bandera" style="width: 30px; height: 20px;"> ${eqV.nombre}
            </div>
        </div>
    `;

    btnGuardarLlave.innerText = mostrarPenales === 'flex' ? 'CONFIRMAR PENALES Y AVANZAR' : 'GUARDAR Y AVANZAR GANADOR';
    modalPartido.style.display = 'flex';
}

if(btnGuardarLlave) {
    btnGuardarLlave.addEventListener('click', () => {
        const gl = document.getElementById('goles-local-llave').value;
        const gv = document.getElementById('goles-visita-llave').value;

        if (gl === '' || gv === '') return;

        partidoEditando.equipo_local.goles = parseInt(gl);
        partidoEditando.equipo_visitante.goles = parseInt(gv);

        let equipoGanador = null;

        if (partidoEditando.equipo_local.goles > partidoEditando.equipo_visitante.goles) {
            equipoGanador = partidoEditando.equipo_local;
            delete partidoEditando.equipo_local.penales; 
            delete partidoEditando.equipo_visitante.penales;
        } else if (partidoEditando.equipo_visitante.goles > partidoEditando.equipo_local.goles) {
            equipoGanador = partidoEditando.equipo_visitante;
            delete partidoEditando.equipo_local.penales;
            delete partidoEditando.equipo_visitante.penales;
        } else {
            const contPenales = document.getElementById('contenedor-penales');
            if (contPenales.style.display === 'none') {
                contPenales.style.display = 'flex';
                btnGuardarLlave.innerText = 'CONFIRMAR PENALES Y AVANZAR';
                return; 
            }

            const pl = document.getElementById('penales-local').value;
            const pv = document.getElementById('penales-visita').value;

            if (pl === '' || pv === '') {
                alert('Faltan cargar los penales para desempatar el partido.');
                return;
            }

            const penalesL = parseInt(pl);
            const penalesV = parseInt(pv);

            if (penalesL === penalesV) {
                alert('Una definición por penales no puede terminar en empate.');
                return;
            }

            partidoEditando.equipo_local.penales = penalesL;
            partidoEditando.equipo_visitante.penales = penalesV;
            equipoGanador = penalesL > penalesV ? partidoEditando.equipo_local : partidoEditando.equipo_visitante;
        }

        const identificadorGanador = `Gan ${partidoEditando.id}`;
        
        for (const fase in datosFixture.fases) {
            datosFixture.fases[fase].forEach(p => {
                if (p.equipo_local.origen === identificadorGanador) {
                    p.equipo_local.nombre = equipoGanador.nombre;
                    p.equipo_local.codigo = equipoGanador.codigo;
                    p.equipo_local.goles = null;
                    delete p.equipo_local.penales; 
                }
                if (p.equipo_visitante.origen === identificadorGanador) {
                    p.equipo_visitante.nombre = equipoGanador.nombre;
                    p.equipo_visitante.codigo = equipoGanador.codigo;
                    p.equipo_visitante.goles = null;
                    delete p.equipo_visitante.penales;
                }
            });
        }

        localStorage.setItem('fixture_llaves', JSON.stringify(datosFixture));
        modalPartido.style.display = 'none';
        armarEstructuraLlaves();
        setTimeout(dibujarConectores, 50);
    });
}

// --- NUEVO SISTEMA DE BORRADO EN CASCADA ---
if(btnResetLlave) {
    btnResetLlave.addEventListener('click', () => {
        if (!confirm('¿Borrar este resultado? El equipo también se borrará de los siguientes partidos.')) return;

        // 1. Vaciamos las cajas de goles del partido actual
        partidoEditando.equipo_local.goles = null;
        partidoEditando.equipo_visitante.goles = null;
        delete partidoEditando.equipo_local.penales;
        delete partidoEditando.equipo_visitante.penales;

        // 2. Función cazafantasmas: Persigue al equipo eliminado por las siguientes fases
        function limpiarCascada(idPartido) {
            const identificadorGanador = `Gan ${idPartido}`;
            for (const fase in datosFixture.fases) {
                datosFixture.fases[fase].forEach(p => {
                    let fueModificado = false;
                    
                    if (p.equipo_local.origen === identificadorGanador) {
                        p.equipo_local.nombre = '';
                        p.equipo_local.codigo = null;
                        p.equipo_local.goles = null;
                        delete p.equipo_local.penales;
                        fueModificado = true;
                    }
                    if (p.equipo_visitante.origen === identificadorGanador) {
                        p.equipo_visitante.nombre = '';
                        p.equipo_visitante.codigo = null;
                        p.equipo_visitante.goles = null;
                        delete p.equipo_visitante.penales;
                        fueModificado = true;
                    }
                    
                    // Si el equipo ya había jugado OTRO partido más adelante, lo limpiamos también
                    if (fueModificado) {
                        p.equipo_local.goles = null; 
                        p.equipo_visitante.goles = null;
                        delete p.equipo_local.penales;
                        delete p.equipo_visitante.penales;
                        limpiarCascada(p.id);
                    }
                });
            }
        }

        limpiarCascada(partidoEditando.id);

        // 3. Guardamos los cambios y repintamos la pantalla
        localStorage.setItem('fixture_llaves', JSON.stringify(datosFixture));
        modalPartido.style.display = 'none';
        armarEstructuraLlaves();
        setTimeout(dibujarConectores, 50);
    });
}

if(btnCerrarPartido) btnCerrarPartido.onclick = () => modalPartido.style.display = 'none';

// ==========================================
// 5. EL CEREBRO EN VIVO (GRUPOS -> 16VOS)
// ==========================================
function actualizarLlavesEnVivo() {
    const tarjetas = document.querySelectorAll('.tarjeta-grupo');
    let clasificados = { primeros: {}, segundos: {}, terceros: [] };

    tarjetas.forEach(tarjeta => {
        const letra = tarjeta.querySelector('.letra-grupo').innerText;
        const divEquipos = tarjeta.querySelectorAll('.equipo');
        let equipos = [];
        let partidosJugados = 0; 
        
        divEquipos.forEach(div => {
            const imgElement = div.querySelector('img');
            const codigo = imgElement.getAttribute('src').split('/').pop().replace('.png', '');
            equipos.push({
                nombre: div.innerText.trim(),
                codigo: codigo,
                origen: `Gr ${letra}`, 
                pts: 0, pj: 0, gf: 0, gc: 0, dg: 0
            });
        });

        const guardado = localStorage.getItem(`grupo_${letra}`);
        if (guardado) {
            let partidos = JSON.parse(guardado);
            partidos.forEach(p => {
                if (p.gl !== null && p.gv !== null) {
                    partidosJugados++; 
                    const eqL = equipos[p.local];
                    const eqV = equipos[p.visita];
                    eqL.gf += p.gl; eqV.gf += p.gv;
                    eqL.gc += p.gv; eqV.gc += p.gl;
                    if (p.gl > p.gv) { eqL.pts += 3; }
                    else if (p.gl < p.gv) { eqV.pts += 3; }
                    else { eqL.pts += 1; eqV.pts += 1; }
                }
            });
            equipos.forEach(eq => eq.dg = eq.gf - eq.gc);
            equipos.sort((a, b) => {
                if (b.pts !== a.pts) return b.pts - a.pts;
                if (b.dg !== a.dg) return b.dg - a.dg;
                return b.gf - a.gf;
            });
        }

        if (partidosJugados > 0) {
            clasificados.primeros[letra] = equipos[0];
            clasificados.segundos[letra] = equipos[1];
            let tercero = equipos[2];
            tercero.origen = `3º ${letra}`; 
            clasificados.terceros.push(tercero);
        } 
        else {
            // ACÁ ESTÁ EL CAMBIO DE FORMATO VISUAL: "1º A", "2º B"
            clasificados.primeros[letra] = { codigo: null, origen: `1º ${letra}` };
            clasificados.segundos[letra] = { codigo: null, origen: `2º ${letra}` };
            clasificados.terceros.push({ codigo: null, origen: `3º ${letra}`, pts: -1, dg: -1, gf: -1 });
        }
    });

    clasificados.terceros.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.dg !== a.dg) return b.dg - a.dg;
        return b.gf - a.gf;
    });
    
    const mejoresTerceros = clasificados.terceros.slice(0, 8); 

    const matrizCruces = [
        { id: "P1", loc: { tipo: '1', letra: 'A' }, vis: { tipo: 'W', index: 0 } },
        { id: "P2", loc: { tipo: '2', letra: 'B' }, vis: { tipo: '2', letra: 'C' } },
        { id: "P3", loc: { tipo: '1', letra: 'D' }, vis: { tipo: 'W', index: 1 } },
        { id: "P4", loc: { tipo: '2', letra: 'E' }, vis: { tipo: '2', letra: 'F' } },
        { id: "P5", loc: { tipo: '1', letra: 'G' }, vis: { tipo: 'W', index: 2 } },
        { id: "P6", loc: { tipo: '2', letra: 'H' }, vis: { tipo: '2', letra: 'I' } },
        { id: "P7", loc: { tipo: '1', letra: 'J' }, vis: { tipo: 'W', index: 3 } },
        { id: "P8", loc: { tipo: '2', letra: 'K' }, vis: { tipo: '2', letra: 'L' } },
        { id: "P9", loc: { tipo: '1', letra: 'B' }, vis: { tipo: 'W', index: 4 } },
        { id: "P10", loc: { tipo: '1', letra: 'C' }, vis: { tipo: '2', letra: 'A' } },
        { id: "P11", loc: { tipo: '1', letra: 'E' }, vis: { tipo: 'W', index: 5 } },
        { id: "P12", loc: { tipo: '1', letra: 'F' }, vis: { tipo: '2', letra: 'D' } },
        { id: "P13", loc: { tipo: '1', letra: 'H' }, vis: { tipo: 'W', index: 6 } },
        { id: "P14", loc: { tipo: '1', letra: 'I' }, vis: { tipo: '2', letra: 'G' } },
        { id: "P15", loc: { tipo: '1', letra: 'K' }, vis: { tipo: 'W', index: 7 } },
        { id: "P16", loc: { tipo: '1', letra: 'L' }, vis: { tipo: '2', letra: 'J' } }
    ];

    function obtenerEquipo(ref) {
        if (ref.tipo === '1') return clasificados.primeros[ref.letra];
        if (ref.tipo === '2') return clasificados.segundos[ref.letra];
        if (ref.tipo === 'W') return mejoresTerceros[ref.index];
    }

    matrizCruces.forEach((mapa, i) => {
        let eqL = obtenerEquipo(mapa.loc);
        let eqV = obtenerEquipo(mapa.vis);
        let partidoJson = datosFixture.fases["16vos"][i];
        
        if(eqL) {
            partidoJson.equipo_local.nombre = eqL.nombre || '';
            partidoJson.equipo_local.codigo = eqL.codigo;
            // Ajuste de seguridad por si usa el fallback:
            partidoJson.equipo_local.origen = eqL.origen || (mapa.loc.tipo === 'W' ? '3º a conf.' : `${mapa.loc.tipo}º ${mapa.loc.letra}`);
        }
        if(eqV) {
            partidoJson.equipo_visitante.nombre = eqV.nombre || '';
            partidoJson.equipo_visitante.codigo = eqV.codigo;
            // Ajuste de seguridad por si usa el fallback:
            partidoJson.equipo_visitante.origen = eqV.origen || (mapa.vis.tipo === 'W' ? '3º a conf.' : `${mapa.vis.tipo}º ${mapa.vis.letra}`);
        }
    });

    localStorage.setItem('fixture_llaves', JSON.stringify(datosFixture));
    
    if (document.getElementById('pantalla-llaves').style.display === 'flex') {
        armarEstructuraLlaves();
        setTimeout(dibujarConectores, 50);
    }
}
// ==========================================
// 6. SINCRONIZACIÓN CON LA NUBE (OPENFOOTBALL)
// ==========================================
async function sincronizarConNube() {
    try {
        const res = await fetch('resultados_nube.json?v=' + new Date().getTime());
        if (!res.ok) throw new Error("No se pudo cargar el archivo");
        
        const datosNube = await res.json();

        // --- Función auxiliar para calcular zonas horarias ---
        function formatearFechaNube(fechaStr, horaStr) {
            const matchHora = horaStr.match(/(\d{2}):(\d{2})\s*UTC([+-]?\d*)/i);
            if (!matchHora) return { fecha: fechaStr, hora: horaStr };

            const [anio, mes, dia] = fechaStr.split('-').map(Number);
            const horaRemota = parseInt(matchHora[1]);
            const minuto = parseInt(matchHora[2]);
            const offsetRemoto = matchHora[3] ? parseInt(matchHora[3]) : 0;
            
            let horaUTC = horaRemota - offsetRemoto;
            let horaArg = horaUTC - 3;
            
            let fechaObj = new Date(anio, mes - 1, dia);
            if (horaArg < 0) { horaArg += 24; fechaObj.setDate(fechaObj.getDate() - 1); } 
            else if (horaArg >= 24) { horaArg -= 24; fechaObj.setDate(fechaObj.getDate() + 1); }
            
            const diaFormat = fechaObj.getDate().toString().padStart(2, '0');
            const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
            return {
                fecha: `${diaFormat} ${meses[fechaObj.getMonth()]}`,
                hora: `${horaArg.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')} hs`
            };
        }

        // ====================================================
        // FASE 1: SINCRONIZAR GRUPOS
        // ====================================================
        const tarjetas = document.querySelectorAll('.tarjeta-grupo');

        tarjetas.forEach(tarjeta => {
            const letra = tarjeta.querySelector('.letra-grupo').innerText;
            const divEquipos = tarjeta.querySelectorAll('.equipo');
            let equipos = [];

            divEquipos.forEach(div => {
                let textoPuro = div.lastChild.nodeValue; 
                if(!textoPuro) textoPuro = div.innerText; 
                equipos.push(textoPuro.trim().toUpperCase());
            });

            localStorage.removeItem(`grupo_${letra}`);

            let partidosGrupo = [
                { local: 0, visita: 1, gl: null, gv: null, fecha: '', hora: '' }, 
                { local: 2, visita: 3, gl: null, gv: null, fecha: '', hora: '' },
                { local: 0, visita: 2, gl: null, gv: null, fecha: '', hora: '' }, 
                { local: 1, visita: 3, gl: null, gv: null, fecha: '', hora: '' },
                { local: 0, visita: 3, gl: null, gv: null, fecha: '', hora: '' }, 
                { local: 1, visita: 2, gl: null, gv: null, fecha: '', hora: '' }
            ];

            partidosGrupo.forEach(p => {
                const eqL = equipos[p.local];
                const eqV = equipos[p.visita];
                const clave1 = `${eqL} VS ${eqV}`;
                const clave2 = `${eqV} VS ${eqL}`;
                
                let data = datosNube[clave1] || datosNube[clave2];
                let invertido = !datosNube[clave1] && datosNube[clave2];

                if (data && data.fecha && data.hora) {
                    const fechH = formatearFechaNube(data.fecha, data.hora);
                    p.fecha = fechH.fecha;
                    p.hora = fechH.hora;

                    if(data.gl !== null && data.gv !== null) {
                        p.gl = invertido ? data.gv : data.gl;
                        p.gv = invertido ? data.gl : data.gv;
                    }
                }
            });
            
            localStorage.setItem(`grupo_${letra}`, JSON.stringify(partidosGrupo));
        });

        // ====================================================
        // FASE 2: ACTUALIZAR LOS CRUCES DE 16VOS (EL CEREBRO)
        // ====================================================
        actualizarLlavesEnVivo();

        // ====================================================
        // FASE 3: SINCRONIZAR LLAVES (ELIMINACIÓN DIRECTA)
        // ====================================================
        // Mapeamos el orden exacto de los partidos para cruzar tu JSON con el HTML
		const mapaLlavesNube = {
            "16vos": [
                "2A VS 2B", "1E VS 3A/B/C/D/F", "1F VS 2C", "1C VS 2F", 
                "1I VS 3C/D/F/G/H", "2E VS 2I", "1A VS 3C/E/F/H/I", "1L VS 3E/H/I/J/K", 
                "1D VS 3B/E/F/I/J", "1G VS 3A/E/H/I/J", "2K VS 2L", "1H VS 2J", 
                "1B VS 3E/F/G/I/J", "1J VS 2H", "1K VS 3D/E/I/J/L", "2D VS 2G"
            ],
            "octavos": ["W74 VS W77", "W73 VS W75", "W76 VS W78", "W79 VS W80", "W83 VS W84", "W81 VS W82", "W86 VS W88", "W85 VS W87"],
            "cuartos": ["W89 VS W90", "W93 VS W94", "W91 VS W92", "W95 VS W96"],
            "semis": ["W97 VS W98", "W99 VS W100"],
            "final": ["W101 VS W102"],
            "tercero": ["L101 VS L102"] // <-- ACÁ AGREGAMOS EL CÓDIGO DEL JSON
        };

        const fasesLlaves = ["16vos", "octavos", "cuartos", "semis", "final", "tercero"];
        
        fasesLlaves.forEach(fase => {
            if (datosFixture.fases[fase]) {
                datosFixture.fases[fase].forEach((partido, index) => {
                    const claveNube = mapaLlavesNube[fase][index];
                    if (!claveNube) return;

                    const data = datosNube[claveNube];
                    if (data) {
                        // Siempre pisamos la fecha y hora con la info de la nube
                        if (data.fecha && data.hora) {
                            const fechH = formatearFechaNube(data.fecha, data.hora);
                            partido.fecha = fechH.fecha;
                            partido.hora = fechH.hora;
                        }

                        // EL MARTILLAZO: Si hay goles oficiales en la nube, PISAMOS la simulación del usuario
                        if (data.gl !== null && data.gv !== null) {
                            partido.equipo_local.goles = data.gl;
                            partido.equipo_visitante.goles = data.gv;
                            
                            // Por si algún día tu API de Python empieza a devolver penales
                            if (data.pl !== undefined) partido.equipo_local.penales = data.pl;
                            if (data.pv !== undefined) partido.equipo_visitante.penales = data.pv;

                            let equipoGanador = null;
                            if (data.gl > data.gv) {
                                equipoGanador = partido.equipo_local;
                                delete partido.equipo_local.penales;
                                delete partido.equipo_visitante.penales;
                            } else if (data.gv > data.gl) {
                                equipoGanador = partido.equipo_visitante;
                                delete partido.equipo_local.penales;
                                delete partido.equipo_visitante.penales;
                            } else {
                                // Empate técnico: Si la nube no mandó penales, respetamos los que el usuario haya cargado a mano para desempatar
                                if (partido.equipo_local.penales > partido.equipo_visitante.penales) equipoGanador = partido.equipo_local;
                                else if (partido.equipo_visitante.penales > partido.equipo_local.penales) equipoGanador = partido.equipo_visitante;
                            }

                            // Avanzamos al ganador automáticamente
                            if (equipoGanador && equipoGanador.codigo) {
                                const identificadorGanador = `Gan ${partido.id}`;
                                for (const f in datosFixture.fases) {
                                    datosFixture.fases[f].forEach(p => {
                                        if (p.equipo_local.origen === identificadorGanador) {
                                            p.equipo_local.nombre = equipoGanador.nombre;
                                            p.equipo_local.codigo = equipoGanador.codigo;
                                        }
                                        if (p.equipo_visitante.origen === identificadorGanador) {
                                            p.equipo_visitante.nombre = equipoGanador.nombre;
                                            p.equipo_visitante.codigo = equipoGanador.codigo;
                                        }
                                    });
                                }
                            }
                        }
                    }
                });
            }
        });

        localStorage.setItem('fixture_llaves', JSON.stringify(datosFixture));

        // Refrescamos la pantalla para mostrar los cambios
        if (document.getElementById('pantalla-llaves').style.display === 'flex') {
            armarEstructuraLlaves();
            setTimeout(dibujarConectores, 50);
        }

    } catch (error) {
        console.error("ERROR CRÍTICO LEYENDO EL JSON:", error);
    }
}

// ==========================================
// 7. TRANSICIONES Y BOTONES DE NAVEGACIÓN
// ==========================================
let estaTransicionando = false;

const btnIrLlaves = document.getElementById('btn-ir-llaves');
const btnVolver = document.getElementById('btn-volver-grupos');
const pantallaGrupos = document.getElementById('pantalla-grupos');
const pantallaLlaves = document.getElementById('pantalla-llaves');

if (btnIrLlaves) {
    btnIrLlaves.addEventListener('click', (e) => {
        if(e) e.stopPropagation();
        if(estaTransicionando) return; // Evita bugs si aprietan rápido
        estaTransicionando = true;

        const columnas = document.querySelectorAll('.columna');
        if(columnas.length === 0) { estaTransicionando = false; return; }

        // 1. Aseguramos el motor de animación fluido
        const tarjetasTodas = document.querySelectorAll('.tarjeta-grupo');
        tarjetasTodas.forEach(t => {
            t.style.transition = 'transform 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.4s ease-in';
        });

        // 2. Cascada de SALIDA (Agregamos las clases)
        columnas[0].querySelectorAll('.tarjeta-grupo').forEach((t, i) => {
            setTimeout(() => t.classList.add('sale-izquierda'), i * 100);
        });
        columnas[columnas.length - 1].querySelectorAll('.tarjeta-grupo').forEach((t, i) => {
            setTimeout(() => t.classList.add('sale-derecha'), i * 100);
        });

        if(btnIrLlaves) btnIrLlaves.style.opacity = '0';

        // 3. Esperamos que terminen de irse y cambiamos la pantalla
        setTimeout(() => {
            if(btnIrLlaves) btnIrLlaves.style.display = 'none';
            if(pantallaGrupos) pantallaGrupos.style.display = 'none';
            
            if (datosFixture && datosFixture.fases) armarEstructuraLlaves();

            if(pantallaLlaves) {
                pantallaLlaves.style.display = 'flex';
                pantallaLlaves.style.opacity = '0';
                void pantallaLlaves.offsetWidth; // Reflow para que detecte el cambio
                pantallaLlaves.style.transition = 'opacity 0.5s ease';
                pantallaLlaves.style.opacity = '1'; // Fade-in suave de las llaves
            }
            
            if (btnVolver) {
                btnVolver.style.display = 'block';
                void btnVolver.offsetWidth;
                btnVolver.style.opacity = '1';
            }
            
            setTimeout(dibujarConectores, 100); 
            estaTransicionando = false;
        }, 800);
    });
}

if (btnVolver) {
    btnVolver.addEventListener('click', (e) => {
        if(e) e.stopPropagation();
        if(estaTransicionando) return;
        estaTransicionando = true;

        // 1. Desvanecemos las llaves elegantemente
        if(pantallaLlaves) {
            pantallaLlaves.style.transition = 'opacity 0.4s ease';
            pantallaLlaves.style.opacity = '0';
        }
        if(btnVolver) btnVolver.style.opacity = '0';
        
        // 2. Cambiamos de pantalla e iniciamos la cascada de ENTRADA
        setTimeout(() => {
            if(pantallaLlaves) pantallaLlaves.style.display = 'none';
            if(btnVolver) btnVolver.style.display = 'none';
            
            if(pantallaGrupos) pantallaGrupos.style.display = 'flex';
            
            const columnas = document.querySelectorAll('.columna');
            if(columnas.length === 0) { estaTransicionando = false; return; }

            // IMPORTANTE: En este punto las tarjetas todavía tienen las clases 
            // 'sale-izquierda' y 'sale-derecha', así que están ocultas afuera de la pantalla.
            
            const tarjetasTodas = document.querySelectorAll('.tarjeta-grupo');
            tarjetasTodas.forEach(t => {
                t.style.transition = 'transform 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.5s ease-out';
            });

            void pantallaGrupos.offsetWidth; // Avisa al navegador que vamos a animar

            // 3. Cascada de ENTRADA (Les sacamos las clases y vuelven solas)
            columnas[0].querySelectorAll('.tarjeta-grupo').forEach((t, i) => {
                setTimeout(() => t.classList.remove('sale-izquierda'), i * 100);
            });
            columnas[columnas.length - 1].querySelectorAll('.tarjeta-grupo').forEach((t, i) => {
                setTimeout(() => t.classList.remove('sale-derecha'), i * 100);
            });

            if (btnIrLlaves) {
                btnIrLlaves.style.display = 'block';
                setTimeout(() => btnIrLlaves.style.opacity = '1', 50);
            }

            setTimeout(() => {
                estaTransicionando = false;
            }, 800);
            
        }, 400); 
    });
}

// Disparamos la carga de datos al abrir la página
inicializarFixture();