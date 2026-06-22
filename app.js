// 1. Import fungsi dari Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot, 
    query, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. Konfigurasi Firebase asli milikmu
const firebaseConfig = {
    apiKey: "AIzaSyAjNv9Dnv4XTVAjmlrP341dKnnsmSReh-c",
    authDomain: "pendataan-warga-digital.firebaseapp.com",
    projectId: "pendataan-warga-digital",
    storageBucket: "pendataan-warga-digital.firebasestorage.app",
    messagingSenderId: "13081110867",
    appId: "1:13081110867:web:d33615732f82e7ecf019a6"
};

// 3. Inisialisasi Firebase & Firestore Database
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const dataCollectionRef = collection(db, "data-bangunan");

// 4. Ambil Elemen DOM
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
let danymicTables = {}; 

// --- RAKIT TOMBOL BATAL SECARA DINAMIS ---
const actionsWrapper = document.createElement("div");
actionsWrapper.className = "form-actions-wrapper";
btnSimpan.before(actionsWrapper);
actionsWrapper.appendChild(btnSimpan);

const btnBatal = document.createElement("button");
btnBatal.type = "button";
btnBatal.id = "btnBatal";
btnBatal.className = "btn-batal";
btnBatal.textContent = "Batal";
actionsWrapper.appendChild(btnBatal);

// --- TRANSFORMASI JUDUL FORM MENJADI COLLAPSE BAR ---
const formCard = dataForm.closest('.card');
const formTitle = formCard.querySelector('h2');
if (formTitle) {
    const headerWrapper = document.createElement('div');
    headerWrapper.className = 'form-collapse-header';
    headerWrapper.id = 'toggleFormBtn';
    headerWrapper.innerHTML = `
        <span>📝 Tambah / Edit Data Warga</span>
        <span class="form-arrow-icon">▼</span>
    `;
    formTitle.replaceWith(headerWrapper);
}

// Efek klik buka-tutup (Collapse) untuk Form
$(document).on('click', '#toggleFormBtn', function() {
    const arrow = $(this).find('.form-arrow-icon');
    $(dataForm).slideToggle(200, function() {
        if ($(dataForm).is(':visible')) {
            arrow.text('▼');
        } else {
            arrow.text('►');
        }
    });
});

// ==========================================
// FITUR 1: SIMPAN / UPDATE DATA
// ==========================================
dataForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const idDokumen = dataIdInput.value;
    const blok = blokRumahInput.value.trim().toUpperCase();
    const nomor = noRumahInput.value.trim().toUpperCase();
    const rt = rtRumahInput.value.trim();
    const rw = rwRumahInput.value.trim();
    
    const alamatLengkap = `VILA DAGO ALAM ASRI I, BLOK H - ${blok} NO. ${nomor} RT. ${rt} RW. ${rw}`;

    const dataWarga = {
        no_urut_bangunan: noBangunanInput.value.trim(),
        no_urut_keluarga: noKeluargaInput.value.trim(),
        nama_kepala_keluarga: namaKepalaInput.value.trim(),
        alamat: alamatLengkap
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
            btnSimpan.textContent = "Simpan Data";
            btnSimpan.style.backgroundColor = "#3498db";
            $(btnBatal).hide();
        }
        dataForm.reset();
        dataIdInput.value = "";
    } catch (error) {
        console.error("Error: ", error);
        alert("Gagal memproses data.");
    }
});

// ==========================================
// FITUR 2: BACA DATA REAL-TIME & PENGELOMPOKAN
// ==========================================
const q = query(dataCollectionRef, orderBy("no_urut_bangunan", "asc"));

onSnapshot(q, (snapshot) => {
    semuaData = [];
    
    Object.keys(danymicTables).forEach(key => {
        if ($.fn.DataTable.isDataTable(`#tabelWarga_${key}`)) {
            $(`#tabelWarga_${key}`).DataTable().destroy();
        }
    });
    danymicTables = {};
    tableContainer.innerHTML = '<h2>Daftar Urutan Data per RT/RW</h2>';

    const kelompokRT_RW = {};

    snapshot.forEach((doc) => {
        const item = { id: doc.id, ...doc.data() };
        semuaData.push(item);

        const alamatRaw = item.alamat || "";
        let alamatUtama = alamatRaw;
        let rtValue = "00";
        let rwValue = "00";

        if (alamatRaw.includes(" RT. ") && alamatRaw.includes(" RW. ")) {
            alamatUtama = alamatRaw.split(" RT. ")[0].trim(); 
            const partSisa = alamatRaw.split(" RT. ")[1]; 
            rtValue = partSisa.split(" RW. ")[0].trim();  
            rwValue = partSisa.split(" RW. ")[1].trim();  
        }

        const keyGroup = `rt${rtValue}_rw${rwValue}`;
        const namaGroupLabel = `RT ${rtValue} / RW ${rwValue}`;

        if (!kelompokRT_RW[keyGroup]) {
            kelompokRT_RW[keyGroup] = { label: namaGroupLabel, warga: [] };
        }

        kelompokRT_RW[keyGroup].warga.push({ ...item, alamatUtama, rtValue, rwValue });
    });

    Object.keys(kelompokRT_RW).sort().forEach((key) => {
        const grup = kelompokRT_RW[key];

        const collapseWrapper = document.createElement("div");
        collapseWrapper.className = "rt-rw-group-wrapper";
        collapseWrapper.innerHTML = `
            <div class="collapse-header" data-target="${key}">
                <span>📍 Data Wilayah: ${grup.label} <small>(${grup.warga.length} Bangunan)</small></span>
                <span class="arrow-icon">▼</span>
            </div>
            <div class="collapse-content active" id="content_${key}">
                <table id="tabelWarga_${key}" class="display nowrap dynamic-warga-table" style="width:100%">
                    <thead>
                        <tr>
                            <th>No. Urut Bangunan</th>
                            <th>No. Urut Keluarga</th>
                            <th>Nama</th>
                            <th>Alamat</th>
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

        const tBodiSpesifik = document.getElementById(`bodi_${key}`);
        grup.warga.forEach((warga) => {
            const baris = document.createElement("tr");
            baris.innerHTML = `
                <td>${warga.no_urut_bangunan}</td>
                <td>${warga.no_urut_keluarga}</td>
                <td>${warga.nama_kepala_keluarga}</td>
                <td>${warga.alamatUtama}</td>
                <td style="text-align: center;">${warga.rtValue}</td>
                <td style="text-align: center;">${warga.rwValue}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn-edit" data-id="${warga.id}" style="background-color: #f1c40f; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: 600;">Edit</button>
                        <button class="btn-delete" data-id="${warga.id}" style="background-color: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: 600;">Hapus</button>
                    </div>
                </td>
            `;
            tBodiSpesifik.appendChild(baris);
        });

        danymicTables[key] = $(`#tabelWarga_${key}`).DataTable({
            "paging": true, "ordering": true, "info": true, "searching": true, "scrollX": true, "responsive": false,
            "columnDefs": [{ "orderable": false, "targets": 6 }]
        });
    });
});

// ==========================================
// FITUR 3: TRIGGER EVENT DELEGATION
// ==========================================
$(document).off('click', '.collapse-header').on('click', '.collapse-header', function() {
    const targetKey = $(this).attr('data-target');
    const contentArea = $(`#content_${targetKey}`);
    const arrow = $(this).find('.arrow-icon');

    contentArea.slideToggle(200, function() {
        if (contentArea.is(':visible') && $.fn.DataTable.isDataTable(`#tabelWarga_${targetKey}`)) {
            $(`#tabelWarga_${targetKey}`).DataTable().columns.adjust().draw();
        }
    });
    
    $(this).toggleClass('collapsed-mode');
    if ($(this).hasClass('collapsed-mode')) { arrow.text('►'); } else { arrow.text('▼'); }
});

$(document).off('click', '.btn-edit').on('click', '.btn-edit', function() {
    const idSelected = $(this).attr('data-id');
    isiFormUntukEdit(idSelected);
});

$(document).off('click', '.btn-delete').on('click', '.btn-delete', function() {
    const idSelected = $(this).attr('data-id');
    hapusDataWarga(idSelected);
});

// LOGIKA KETIKA TOMBOL BATAL DIKLIK
$(document).on('click', '#btnBatal', function() {
    dataForm.reset();
    dataIdInput.value = "";
    btnSimpan.textContent = "Simpan Data";
    btnSimpan.style.backgroundColor = "#3498db";
    $(this).hide();
    $(dataForm).slideUp(200);
    $('#toggleFormBtn').find('.form-arrow-icon').text('►');
});

// ==========================================
// FITUR TARIK DATA KE FORM UNTUK EDIT
// ==========================================
function isiFormUntukEdit(id) {
    const dataDipilih = semuaData.find(item => item.id === id);
    if (dataDipilih) {
        if (!$(dataForm).is(':visible')) {
            $(dataForm).slideDown(200);
            $('#toggleFormBtn').find('.form-arrow-icon').text('▼');
        }

        dataIdInput.value = dataDipilih.id;
        noBangunanInput.value = dataDipilih.no_urut_bangunan;
        noKeluargaInput.value = dataDipilih.no_urut_keluarga;
        namaKepalaInput.value = dataDipilih.nama_kepala_keluarga;
        
        const alamatRaw = dataDipilih.alamat;
        let blokValue = "";
        let noRumahValue = "";
        let rtValue = "";
        let rwValue = "";

        if (alamatRaw.includes("BLOK H - ") && alamatRaw.includes(" NO. ") && alamatRaw.includes(" RT. ") && alamatRaw.includes(" RW. ")) {
            const partBlok = alamatRaw.split("BLOK H - ")[1]; 
            blokValue = partBlok.split(" NO. ")[0].trim(); 
            const partNo = partBlok.split(" NO. ")[1]; 
            noRumahValue = partNo.split(" RT. ")[0].trim(); 
            const partRT = partNo.split(" RT. ")[1]; 
            rtValue = partRT.split(" RW. ")[0].trim(); 
            rwValue = partRT.split(" RW. ")[1].trim(); 
        } else if (alamatRaw.includes("BLOK H - ") && alamatRaw.includes(" NO. ")) {
            const partBlok = alamatRaw.split("BLOK H - ")[1];
            blokValue = partBlok.split(" NO. ")[0].trim();
            noRumahValue = partBlok.split(" NO. ")[1].trim();
        }

        blokRumahInput.value = blokValue;
        noRumahInput.value = noRumahValue;
        rtRumahInput.value = rtValue;
        rwRumahInput.value = rwValue;

        btnSimpan.textContent = "Perbarui Data Warga";
        btnSimpan.style.backgroundColor = "#2ecc71";
        $(btnBatal).show(); 
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// ==========================================
// FITUR EKSEKUSI HAPUS DATA
// ==========================================
async function hapusDataWarga(id) {
    if (confirm("Apakah Anda yakin ingin menghapus data warga ini dari database?")) {
        try {
            const docRef = doc(db, "data-bangunan", id);
            await deleteDoc(docRef);
            alert("Data berhasil dihapus!");
        } catch (error) {
            console.error("Error saat menghapus: ", error);
            alert("Gagal menghapus data.");
        }
    }
}