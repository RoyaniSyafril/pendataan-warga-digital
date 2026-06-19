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
const tabelBodi = document.getElementById("tabelBodi");

let semuaData = [];
let dataTableInstance = null; // Menyimpan instance jalannya DataTables

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
        }
        dataForm.reset();
        dataIdInput.value = "";
    } catch (error) {
        console.error("Error: ", error);
        alert("Gagal memproses data.");
    }
});

// ==========================================
// FITUR 2: BACA DATA REAL-TIME
// ==========================================
const q = query(dataCollectionRef, orderBy("no_urut_bangunan", "asc"));

onSnapshot(q, (snapshot) => {
    semuaData = [];
    snapshot.forEach((doc) => {
        semuaData.push({ id: doc.id, ...doc.data() });
    });
    tampilkanData(semuaData);
});

// ==========================================
// FITUR 3: TAMPILKAN DATA KE TABEL + DATA TABLES
// ==========================================
function tampilkanData(daftarData) {
    // Hancurkan DataTables lama jika ada, agar tidak duplikat saat data di-render ulang
    if ($.fn.DataTable.isDataTable('#tabelWarga')) {
        $('#tabelWarga').DataTable().destroy();
    }

    tabelBodi.innerHTML = "";
    
    daftarData.forEach((item) => {
        const alamatRaw = item.alamat;
        let alamatUtama = alamatRaw;
        let rtValue = "-";
        let rwValue = "-";

        if (alamatRaw.includes(" RT. ") && alamatRaw.includes(" RW. ")) {
            alamatUtama = alamatRaw.split(" RT. ")[0].trim(); 
            const partSisa = alamatRaw.split(" RT. ")[1]; 
            rtValue = partSisa.split(" RW. ")[0].trim();  
            rwValue = partSisa.split(" RW. ")[1].trim();  
        }

        const baris = document.createElement("tr");
        baris.innerHTML = `
            <td>${item.no_urut_bangunan}</td>
            <td>${item.no_urut_keluarga}</td>
            <td>${item.nama_kepala_keluarga}</td>
            <td>${alamatUtama}</td>
            <td style="text-align: center;">${rtValue}</td>
            <td style="text-align: center;">${rwValue}</td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-edit" data-id="${item.id}" style="background-color: #f1c40f; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: 600;">Edit</button>
                    <button class="btn-delete" data-id="${item.id}" style="background-color: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: 600;">Hapus</button>
                </div>
            </td>
        `;
        tabelBodi.appendChild(baris);
    });

    // Jalankan Fitur Menggunakan DataTables Library
    dataTableInstance = $('#tabelWarga').DataTable({
        "paging": true,      
        "ordering": true,    
        "info": true,        
        "searching": true,   
        "responsive": true,  
        "columnDefs": [
            { "orderable": false, "targets": 6 } // Mematikan fitur sortir khusus untuk kolom "Aksi"
        ]
    });

    // ==========================================================
    // FIX: EVENT DELEGATION AGAR TOMBOL WORK DI HP DAN DATATABLES
    // ==========================================================
    
    // Event Klik untuk Tombol Edit
    $('#tabelWarga').off('click', '.btn-edit').on('click', '.btn-edit', function() {
        const idSelected = $(this).attr('data-id');
        isiFormUntukEdit(idSelected);
    });

    // Event Klik untuk Tombol Hapus
    $('#tabelWarga').off('click', '.btn-delete').on('click', '.btn-delete', function() {
        const idSelected = $(this).attr('data-id');
        hapusDataWarga(idSelected);
    });
}

// ==========================================
// FITUR TARIK DATA KE FORM UNTUK EDIT
// ==========================================
function isiFormUntukEdit(id) {
    const dataDipilih = semuaData.find(item => item.id === id);
    if (dataDipilih) {
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