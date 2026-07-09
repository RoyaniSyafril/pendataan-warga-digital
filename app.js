import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { gambarPetaKontrolSpesifik } from "./peta.js";

const firebaseConfig = {
    apiKey: "AIzaSyAjNv9Dnv4XTVAjmlrP341dKnnsmSReh-c",
    authDomain: "pendataan-warga-digital.firebaseapp.com",
    projectId: "pendataan-warga-digital",
    storageBucket: "pendataan-warga-digital.firebasestorage.app",
    messagingSenderId: "13081110867",
    appId: "1:13081110867:web:d33615732f82e7ecf019a6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const dataCollectionRef = collection(db, "data-bangunan");

// Ambil Elemen DOM
const dataForm = document.getElementById("dataForm");
const dataIdInput = document.getElementById("dataId");
const noBangunanInput = document.getElementById("noBangunan");
const noKeluargaInput = document.getElementById("noKeluarga");
const namaKepalaInput = document.getElementById("namaKepala");
const blokRumahInput = document.getElementById("blokRumah");
const noRumahInput = document.getElementById("noRumah");
const rtRumahInput = document.getElementById("rtRumah"); 
const rwRumahInput = document.getElementById("rwRumah"); 
const btnSimpan = document.getElementById("btnSimpan");
const tableContainer = document.querySelector(".table-container");

let semuaData = [];
let dynamicTables = {}; 
let zoomScales = {}; // Menyimpan level zoom aktif untuk masing-masing RT

// Rakit Tombol Batal
const actionsWrapper = document.createElement("div");
actionsWrapper.className = "form-actions-wrapper";
btnSimpan.before(actionsWrapper);
actionsWrapper.appendChild(btnSimpan);

const btnBatal = document.createElement("button");
btnBatal.type = "button"; btnBatal.id = "btnBatal"; btnBatal.className = "btn-batal"; btnBatal.textContent = "Batal";
actionsWrapper.appendChild(btnBatal);
$(btnBatal).hide();

// Collapse Form Bar Header
const formCard = dataForm.closest('.card');
const formTitle = formCard.querySelector('h2');
if (formTitle) {
    const headerWrapper = document.createElement('div');
    headerWrapper.className = 'form-collapse-header'; headerWrapper.id = 'toggleFormBtn';
    headerWrapper.innerHTML = `<span>📝 Tambah / Edit Data Warga</span><span class="form-arrow-icon">▼</span>`;
    formTitle.replaceWith(headerWrapper);
}

$(document).on('click', '#toggleFormBtn', function() {
    const arrow = $(this).find('.form-arrow-icon');
    $(dataForm).slideToggle(200, function() {
        arrow.text($(dataForm).is(':visible') ? '▼' : '►');
    });
});

// SIMPAN / UPDATE DATA
dataForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const idDokumen = dataIdInput.value;

    const bngVal = noBangunanInput.value.trim();
    const famVal = noKeluargaInput.value.trim();
    const namaVal = namaKepalaInput.value.trim();
    const blokVal = blokRumahInput.value.trim().toUpperCase();
    const noRumahVal = noRumahInput.value.trim().toUpperCase();
    const rtVal = rtRumahInput.value.trim().replace(/\D/g, '').padStart(3, '0'); // Bersihkan non-angka
    const rwVal = rwRumahInput.value.trim().replace(/\D/g, '').padStart(3, '0');

    const dataWarga = {
        no_urut_bangunan: bngVal,
        no_urut_keluarga: famVal,
        nama_kepala_keluarga: namaVal,
        blok: blokVal,
        no_rumah: noRumahVal,
        rt: rtVal,
        rw: rwVal,
        alamat: `VILA DAGO ALAM ASRI I, BLOK H - ${blokVal} NO. ${noRumahVal} RT. ${rtVal} RW. ${rwVal}`
    };

    try {
        if (idDokumen === "") {
            dataWarga.created_at = new Date();
            await addDoc(dataCollectionRef, dataWarga);
            alert("Data berhasil tersimpan!");
        } else {
            const docRef = doc(db, "data-bangunan", idDokumen);
            await updateDoc(docRef, dataWarga);
            alert("Data berhasil diperbarui!");
        }
        resetForm();
    } catch (error) {
        console.error(error);
        alert("Gagal memproses data.");
    }
});

// REAL-TIME ON SNAPSHOT (FIX AUTO-SCROLL LOOMING)
const q = query(dataCollectionRef, orderBy("no_urut_bangunan", "asc"));

onSnapshot(q, (snapshot) => {
    // 1. AMBIL DAN SIMPAN POSISI SCROLL SEBELUM CONTAINER DIHANCURKAN
    const posisiScrollLama = {};
    $('.canvas-scroll-container').each(function() {
        const idContainer = $(this).closest('.collapse-content').attr('id');
        if (idContainer) {
            posisiScrollLama[idContainer] = {
                left: $(this).scrollLeft(),
                top: $(this).scrollTop()
            };
        }
    });

    semuaData = [];
    Object.keys(dynamicTables).forEach(key => {
        if ($.fn.DataTable.isDataTable(`#tabelWarga_${key}`)) {
            $(`#tabelWarga_${key}`).DataTable().destroy(true); // Hapus bersih tabel dari DOM
        }
    });
    dynamicTables = {};
    tableContainer.innerHTML = '<h2>Daftar Urutan Data per RT/RW</h2>';

    const kelompokRT_RW = {};

    snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        
        let rtLama = "000"; let rwLama = "000"; let blokLama = "?"; let noRumahLama = "?";
        const alamatRaw = d.alamat || "";

        if (!d.rt && alamatRaw.includes(" RT. ") && alamatRaw.includes(" RW. ")) {
            const partSisa = alamatRaw.split(" RT. ")[1]; 
            rtLama = partSisa.split(" RW. ")[0].trim().padStart(3, '0');  
            rwLama = partSisa.split(" RW. ")[1].trim().padStart(3, '0');  
            
            if (alamatRaw.includes("BLOK H - ") && alamatRaw.includes(" NO. ")) {
                const partBlok = alamatRaw.split("BLOK H - ")[1]; 
                blokLama = partBlok.split(" NO. ")[0].trim();
                noRumahLama = partBlok.split(" NO. ")[1].split(" RT. ")[0].trim();
            }
        }

        const item = { 
            id: docSnap.id, 
            ...d,
            blok: d.blok || blokLama,
            no_rumah: d.no_rumah || noRumahLama,
            rt: (d.rt || rtLama).padStart(3, '0'),
            rw: (d.rw || rwLama).padStart(3, '0')
        };
        semuaData.push(item);

        const keyGroup = `rt${item.rt}_rw${item.rw}`;
        if (!kelompokRT_RW[keyGroup]) {
            kelompokRT_RW[keyGroup] = { label: `RT ${item.rt} / RW ${item.rw}`, warga: [] };
        }
        kelompokRT_RW[keyGroup].warga.push(item);
    });

    // Render Tabel & Peta Kelompok Wilayah dengan Fitur Zoom
    Object.keys(kelompokRT_RW).sort().forEach((key) => {
        const grup = kelompokRT_RW[key];
        
        if (!zoomScales[key]) zoomScales[key] = 1.0;

        const collapseWrapper = document.createElement("div");
        collapseWrapper.className = "rt-rw-group-wrapper";
        collapseWrapper.innerHTML = `
            <div class="collapse-header" data-target="${key}">
                <span>📍 Data Wilayah: ${grup.label} <small>(${grup.warga.length} Bangunan)</small></span>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <button class="btn-cetak" data-print="${key}" style="z-index: 10;">🖨️ Cetak Denah & Data</button>
                    <span class="arrow-icon">▼</span>
                </div>
            </div>
            <div class="collapse-content active" id="content_${key}">
                <div style="margin-bottom: 20px; padding: 5px 10px;">
                    
                    <div class="zoom-control-panel">
                        <span style="font-size:0.85rem; font-weight:bold; color:#64748b;">🗺️ Peta Kendali Urutan Bangunan:</span>
                        <div class="zoom-buttons">
                            <button class="btn-zoom" data-zoom-action="out" data-rt="${key}">➖</button>
                            <span class="zoom-text" id="zoomText_${key}">100%</span>
                            <button class="btn-zoom" data-zoom-action="in" data-rt="${key}">➕</button>
                            <button class="btn-zoom-reset" data-zoom-action="reset" data-rt="${key}">Reset</button>
                        </div>
                    </div>

                    <div class="canvas-scroll-container">
                        <div id="canvasViewport_${key}" class="canvas-viewport" style="transform: scale(1); transform-origin: top left;">
                            <div id="gridPetaRumah_${key}" class="grid-peta-rumah"></div>
                        </div>
                    </div>
                </div>
                <table id="tabelWarga_${key}" class="display nowrap dynamic-warga-table" style="width:100%">
                    <thead>
                        <tr>
                            <th>No. Urut Bangunan</th>
                            <th>No. Urut Keluarga</th>
                            <th>Nama</th>
                            <th>Alamat Rumah</th>
                            <th style="text-align: center;">RT</th>
                            <th style="text-align: center;">RW</th>
                            <th class="no-sort">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="bodi_${key}"></tbody>
                </table>
            </div>
        `;
        tableContainer.appendChild(collapseWrapper);

        // Render objek denah rumah warga
        gambarPetaKontrolSpesifik(`gridPetaRumah_${key}`, grup.warga, isiFormUntukEdit, updateKoordinatWarga);
        
        // Kembalikan ke level zoom terakhir yang aktif
        aplikasikanSkalaZoom(key);

        const tBodiSpesifik = document.getElementById(`bodi_${key}`);
        grup.warga.forEach((warga) => {
            const baris = document.createElement("tr");
            baris.innerHTML = `
                <td>${warga.no_urut_bangunan}</td>
                <td>${warga.no_urut_keluarga}</td>
                <td>${warga.nama_kepala_keluarga}</td>
                <td>BLOK H - ${warga.blok} NO. ${warga.no_rumah}</td>
                <td style="text-align: center;">${warga.rt}</td>
                <td style="text-align: center;">${warga.rw}</td>
                <td>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <button class="btn-lacak-peta" data-id="${warga.id}" data-rt="${key}" style="background-color: #9b59b6; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">📍 Peta</button>                        
                        <button class="btn-edit" data-id="${warga.id}" style="background-color: #f1c40f; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">Edit</button>
                        <button class="btn-delete" data-id="${warga.id}" style="background-color: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.85rem;">Hapus</button>
                    </div>
                </td>
            `;
            tBodiSpesifik.appendChild(baris);
        });

        dynamicTables[key] = $(`#tabelWarga_${key}`).DataTable({
            "paging": true, "ordering": true, "info": true, "searching": true, "scrollX": true,
            "columnDefs": [{ "orderable": false, "targets": 6 }]
        });

        // 2. KEMBALIKAN POSISI SCROLL SECARA INSTAN SETELAH ELEMENT RE-RENDER
        const idContent = `content_${key}`;
        if (posisiScrollLama[idContent]) {
            const containerPeta = $(`#${idContent} .canvas-scroll-container`);
            containerPeta.scrollLeft(posisiScrollLama[idContent].left);
            containerPeta.scrollTop(posisiScrollLama[idContent].top);
        }
    });
});

// Handler Pengatur Zoom Kontainer Peta
$(document).off('click', '.btn-zoom, .btn-zoom-reset').on('click', '.btn-zoom, .btn-zoom-reset', function(e) {
    e.stopPropagation();
    const rtKey = $(this).attr('data-rt');
    const aksi = $(this).attr('data-zoom-action');

    if (aksi === "in" && zoomScales[rtKey] < 2.0) {
        zoomScales[rtKey] += 0.15;
    } else if (aksi === "out" && zoomScales[rtKey] > 0.4) {
        zoomScales[rtKey] -= 0.15;
    } else if (aksi === "reset") {
        zoomScales[rtKey] = 1.0;
    }

    aplikasikanSkalaZoom(rtKey);
});

// Fungsi Aplikasi CSS Transform Zoom
function aplikasikanSkalaZoom(rtKey) {
    const viewport = document.getElementById(`canvasViewport_${rtKey}`);
    const textLabel = document.getElementById(`zoomText_${rtKey}`);
    if (viewport && textLabel) {
        const skalaPersen = Math.round(zoomScales[rtKey] * 100);
        viewport.style.transform = `scale(${zoomScales[rtKey]})`;
        textLabel.textContent = `${skalaPersen}%`;

        const gridPeta = document.getElementById(`gridPetaRumah_${rtKey}`);
        if(gridPeta) {
            gridPeta.setAttribute('data-skala-aktif', zoomScales[rtKey]);
        }
    }
}

// Simpan Posisi Baru ke Firebase
async function updateKoordinatWarga(id, x, y) {
    try {
        const docRef = doc(db, "data-bangunan", id);
        await updateDoc(docRef, {
            pos_x: x,
            pos_y: y
        });
        console.log(`Koordinat posisi baru berhasil disimpan.`);
    } catch (error) {
        console.error("Gagal menyimpan posisi baru: ", error);
    }
}

// =========================================================================
// HANDLER CETAK / PRINT DENAH & DATA WARGA (VERSI FIX MULTI-ORIENTASI)
// =========================================================================
$(document).off('click', '.btn-cetak').on('click', '.btn-cetak', function(e) {
    e.stopPropagation();
    const targetKey = $(this).attr('data-print');
    const $currentGroup = $(this).closest('.rt-rw-group-wrapper');
    
    // 1. BONGKAR DATATABLES (Agar baris data warga keluar semua)
    let dataTableInstance = dynamicTables[targetKey];
    let ukuranHalamanSemula = 10; 

    if (dataTableInstance) {
        ukuranHalamanSemula = dataTableInstance.page.len(); 
        dataTableInstance.page.len(-1).draw(); 
    }

    // 2. SEMBUNYIKAN GRUP RT LAIN (Hanya tampilkan yang sedang dicetak)
    // Simpan status elemen yang sedang aktif/terbuka sebelum dicetak
    const $otherGroups = $('.rt-rw-group-wrapper').not($currentGroup);
    
    $otherGroups.hide();
    $currentGroup.addClass('print-active-mode').show();

    // 3. JALANKAN PROSES CETAK BROWSER
    setTimeout(() => {
        window.print();

        // 4. KEMBALIKAN SEMUANYA KE SEMULA (Normalisasi Tampilan Monitor & HP)
        if (dataTableInstance) {
            dataTableInstance.page.len(ukuranHalamanSemula).draw(); 
        }

        $currentGroup.removeClass('print-active-mode');
        
        // FIX: Jangan langsung .show() semua grup!
        // Kembalikan ke sistem filter awal. Jika di HP sedang memfilter RT tertentu,
        // biarkan grup lain tetap tersembunyi seperti semula.
        if (typeof kembalikanFilterHalaman === "function") {
            kembalikanFilterHalaman(); // Panggil fungsi filter bawaan aplikasi jika ada
        } else {
            // Jika tidak ada fungsi filter global, kembalikan kontrol ke kondisi sebelum tombol cetak diklik
            $otherGroups.css('display', ''); 
        }

        aplikasikanSkalaZoom(targetKey); // Sinkronisasi ulang zoom monitor
    }, 500); // Naikkan ke 500ms agar perangkat HP punya waktu merender DataTables raksasa (-1) sebelum cetak
});

// Accordion Collapse Menu
$(document).off('click', '.collapse-header').on('click', '.collapse-header', function() {
    const targetKey = $(this).attr('data-target');
    $(`#content_${targetKey}`).slideToggle(200);
    $(this).toggleClass('collapsed-mode');
    $(this).find('.arrow-icon').text($(this).hasClass('collapsed-mode') ? '►' : '▼');
});

$(document).on('click', '.btn-edit', function() { isiFormUntukEdit($(this).attr('data-id')); });
$(document).on('click', '.btn-delete', function() { hapusDataWarga($(this).attr('data-id')); });
$(document).on('click', '#btnBatal', function() { resetForm(); });

function isiFormUntukEdit(id) {
    const d = semuaData.find(item => item.id === id);
    if (d) {
        if (!$(dataForm).is(':visible')) { $(dataForm).slideDown(200); $('#toggleFormBtn').find('.form-arrow-icon').text('▼'); }
        dataIdInput.value = d.id;
        noBangunanInput.value = d.no_urut_bangunan;
        noKeluargaInput.value = d.no_urut_keluarga;
        namaKepalaInput.value = d.nama_kepala_keluarga;
        blokRumahInput.value = d.blok;
        noRumahInput.value = d.no_rumah;
        rtRumahInput.value = d.rt;
        rwRumahInput.value = d.rw;

        btnSimpan.textContent = "Perbarui Data Warga";
        btnSimpan.style.backgroundColor = "#2ecc71";
        $(btnBatal).show(); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function resetForm() {
    dataForm.reset(); dataIdInput.value = "";
    btnSimpan.textContent = "Simpan Data"; btnSimpan.style.backgroundColor = "#3498db";
    $(btnBatal).hide(); $(dataForm).slideUp(200); $('#toggleFormBtn').find('.form-arrow-icon').text('►');
}

async function hapusDataWarga(id) {
    if (confirm("Hapus data warga ini dari database?")) {
        try { await deleteDoc(doc(db, "data-bangunan", id)); alert("Data terhapus!"); } catch (e) { alert("Gagal menghapus."); }
    }
}

// HANDLER: Lacak Lokasi Warga di Peta (Warna Merah + Siap Pindah)
$(document).on('click', '.btn-lacak-peta', function() {
    const idWarga = $(this).attr('data-id');
    const rtKey = $(this).attr('data-rt');

    const gridPeta = document.getElementById(`gridPetaRumah_${rtKey}`);
    if (!gridPeta) return;

    const kotakTarget = gridPeta.querySelector(`[data-id="${idWarga}"]`);
    const scrollContainer = gridPeta.closest('.canvas-scroll-container');

    if (kotakTarget && scrollContainer) {
        const contentArea = $(`#content_${rtKey}`);
        if (!contentArea.is(':visible')) {
            contentArea.slideDown(200);
            $(`.collapse-header[data-target="${rtKey}"]`).removeClass('collapsed-mode').find('.arrow-icon').text('▼');
        }

        const skalaAktif = parseFloat(gridPeta.getAttribute('data-skala-aktif')) || 1.0;
        const targetX = (kotakTarget.offsetLeft * skalaAktif) - (scrollContainer.clientWidth / 2) + 37;
        const targetY = (kotakTarget.offsetTop * skalaAktif) - (scrollContainer.clientHeight / 2) + 24;

        scrollContainer.scrollTo({
            left: targetX,
            top: targetY,
            behavior: 'smooth'
        });

        // Trigger fungsi klik internal pada kotak agar menyala merah & mengunci mode pemindahan bangunan
        kotakTarget.click();

    } else {
        alert("Kotak rumah belum di-plot atau diposisikan di dalam peta denah.");
    }
});