/**
 * Peta.js - Modul Peta Mandiri dengan Sistem Klik Instan (Teleportasi ke Grid)
 * FITUR: MULTI-SELECT HP (LONG PRESS), UNDO (↩️), DAN REDO (↪️) MASSAL & SATUAN
 * DISESUAIKAN UNTUK UKURAN KANVAS BARU (3200px x 1600px)
 */

// 1. VARIABEL GLOBAL MODUL (Tetap aman di memori selama aplikasi terbuka)
let daftarIdTerpilih = [];
let riwayatUndo = [];
let riwayatRedo = [];

// Menyimpan referensi fungsi update firebase agar bisa diakses oleh tombol Undo/Redo di luar scope
let fungsiUpdateKoordinatGlobal = null; 

export function gambarPetaKontrolSpesifik(idKontainerPeta, dataWargaPerRT, fungsiIsiFormEdit, fungsiUpdateKoordinat) {
    const gridPeta = document.getElementById(idKontainerPeta);
    if (!gridPeta) return;

    // Simpan fungsi update ke variabel global modul agar tombol luar bisa memakainya
    fungsiUpdateKoordinatGlobal = fungsiUpdateKoordinat;

    gridPeta.innerHTML = ""; 

    if (dataWargaPerRT.length === 0) {
        gridPeta.innerHTML = `<span style="color: #64748b; font-size: 0.85rem; padding: 10px; display: block;">Belum ada bangunan terdata.</span>`;
        return;
    }

    // Panggil pembuatan panel tombol (Fungsi ini sudah aman, tidak akan membuat tombol ganda)
    buatTombolUndoRedoVisual(gridPeta);

    // Handler klik di area kosong kanvas denah (Proses Pemindahan Berkelompok / Satuan)
    gridPeta.onclick = function(e) {
        // PASTIKAN yang diklik benar-benar background kanvas dan ada rumah yang sedang terpilih
        if (e.target === gridPeta && daftarIdTerpilih.length > 0) {
            
            const rect = gridPeta.getBoundingClientRect();
            const skalaAktif = parseFloat(gridPeta.getAttribute('data-skala-aktif')) || 1.0;
            
            let rawX = (e.clientX - rect.left) / skalaAktif;
            let rawY = (e.clientY - rect.top) / skalaAktif;

            let targetX = Math.floor(rawX / 80) * 80 + 10;
            let targetY = Math.floor(rawY / 55) * 55 + 10;

            const idJangkar = daftarIdTerpilih[0];
            const kotakJangkar = gridPeta.querySelector(`[data-id="${idJangkar}"]`);
            
            if (kotakJangkar) {
                let awalX = parseInt(kotakJangkar.style.left) || 10;
                let awalY = parseInt(kotakJangkar.style.top) || 10;

                let deltaX = targetX - awalX;
                let deltaY = targetY - awalY;

                // Wadah mencatat riwayat pemindahan aksi saat ini
                let dataAksiSekarang = [];

                // Looping semua ID yang ada di daftar terpilih (bisa 1 rumah, bisa banyak)
                daftarIdTerpilih.forEach(id => {
                    const kotakAktif = gridPeta.querySelector(`[data-id="${id}"]`);
                    if (kotakAktif) {
                        let posLamaX = parseInt(kotakAktif.style.left) || 10;
                        let posLamaY = parseInt(kotakAktif.style.top) || 10;

                        let baruX = posLamaX + deltaX;
                        let baruY = posLamaY + deltaY;

                        // Pembatas koordinat kanvas (3200x1600)
                        if (baruX < 10) baruX = 10;
                        if (baruY < 10) baruY = 10;
                        if (baruX > 3120) baruX = 3120;
                        if (baruY > 1545) baruY = 1545;

                        // Catat koordinat murni SEBELUM dan SESUDAH untuk disimpan ke Undo
                        dataAksiSekarang.push({
                            id: id,
                            sebelumX: posLamaX,
                            sebelumY: posLamaY,
                            sesudahX: baruX,
                            sesudahY: baruY
                        });

                        // Update visual posisi rumah di layar
                        kotakAktif.style.left = `${baruX}px`;
                        kotakAktif.style.top = `${baruY}px`;
                        
                        // Kirim perubahan koordinat ke Firebase database
                        fungsiUpdateKoordinat(id, baruX, baruY);
                    }
                });

                // MASUKKAN KE STACK UNDO DISINI (Sebelum status terpilih dihapus)
                if (dataAksiSekarang.length > 0) {
                    riwayatUndo.push(dataAksiSekarang);
                    riwayatRedo = []; // Reset Redo karena ada langkah baru
                    perbaruiStatusTombolVisual(); // Nyalakan warna tombol visual
                }
            }

            // Baru setelah sukses tercatat ke riwayat Undo, bersihkan warna merahnya
            bersihkanStatusTerpilih(gridPeta);
        }
    };

    // Plotting titik koordinat seluruh rumah
    dataWargaPerRT.forEach((warga, index) => {
        const labelNoBangunan = String(warga.no_urut_bangunan || 0).padStart(3, '0');
        const teksAlamatRingkas = `H-${warga.blok}/${warga.no_rumah}`;

        const kotak = document.createElement("div");
        kotak.className = "kotak-rumah terdata"; 
        kotak.setAttribute("data-id", warga.id);
        kotak.setAttribute("draggable", "false"); 
        kotak.style.cursor = "pointer";

        const posX = warga.pos_x !== undefined ? warga.pos_x : (index % 38) * 80 + 10;
        const posY = warga.pos_y !== undefined ? warga.pos_y : Math.floor(index / 38) * 55 + 10;

        kotak.style.left = `${posX}px`;
        kotak.style.top = `${posY}px`;
        
        kotak.innerHTML = `
            <span style="font-size: 0.68rem; color: #ffffff !important; font-weight: 800; display: block; line-height: 1.1;">B: ${labelNoBangunan}</span>
            <span style="font-size: 0.75rem; font-weight: 600; color: #ffffff !important; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${warga.nama_kepala_keluarga.split(' ')[0]}</span>
            <span style="font-size: 0.5rem; color: #ffffff !important; background: rgba(0,0,0,0.25); padding: 1px 2px; border-radius: 2px; margin-top: 1px; text-align: center; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${teksAlamatRingkas}
            </span>
            <div class="opsi-kotak-btn" style="position: absolute; bottom: 2px; right: 4px; font-size: 0.6rem; background: rgba(255,255,255,0.3); padding: 0px 3px; border-radius: 3px; color: #fff; font-weight: bold;">🔎</div>
        `;
        
        // --- LOGIKA SENTUHAN JARI (MOBILE FRIENDLY LONG PRESS) ---
        let penandaWaktuSentuh;
        let statusApakahLongPress = false;

        const mulaiSentuhan = function(e) {
            statusApakahLongPress = false;
            penandaWaktuSentuh = setTimeout(() => {
                statusApakahLongPress = true;
                
                if (daftarIdTerpilih.includes(warga.id)) {
                    daftarIdTerpilih = daftarIdTerpilih.filter(id => id !== warga.id);
                    kotak.style.backgroundColor = ""; kotak.style.outline = "none"; kotak.style.boxShadow = "none"; kotak.style.zIndex = "1";
                } else {
                    daftarIdTerpilih.push(warga.id);
                    warnaiKotakTerpilih(kotak);
                    if (navigator.vibrate) navigator.vibrate(50);
                }
            }, 600); 
        };

        const batalkanSentuhan = function() {
            clearTimeout(penandaWaktuSentuh);
        };

        kotak.addEventListener("mousedown", mulaiSentuhan);
        kotak.addEventListener("touchstart", mulaiSentuhan, { passive: true });
        kotak.addEventListener("mouseup", batalkanSentuhan);
        kotak.addEventListener("mouseleave", batalkanSentuhan);
        kotak.addEventListener("touchend", batalkanSentuhan);
        
        kotak.onclick = function(e) {
            e.stopPropagation();

            if (statusApakahLongPress) return;

            if (e.target.classList.contains('opsi-kotak-btn') || (daftarIdTerpilih.length === 1 && daftarIdTerpilih[0] === warga.id)) {
                tampilkanPopUpDetail(warga, labelNoBangunan, fungsiIsiFormEdit);
                bersihkanStatusTerpilih(gridPeta);
                return;
            }

            if (daftarIdTerpilih.length > 0) {
                if (daftarIdTerpilih.includes(warga.id)) {
                    daftarIdTerpilih = daftarIdTerpilih.filter(id => id !== warga.id);
                    kotak.style.backgroundColor = ""; kotak.style.outline = "none"; kotak.style.boxShadow = "none"; kotak.style.zIndex = "1";
                } else {
                    daftarIdTerpilih.push(warga.id);
                    warnaiKotakTerpilih(kotak);
                }
            } else {
                bersihkanStatusTerpilih(gridPeta);
                daftarIdTerpilih.push(warga.id);
                warnaiKotakTerpilih(kotak);
            }
        };

        gridPeta.appendChild(kotak);
    });
}

// ======================== ENGINE FITUR UNDO & REDO FIXED ========================

function buatTombolUndoRedoVisual(gridPeta) {
    // Jika tombol sudah pernah ada di body, jangan buat baru lagi (mencegah duplikasi event listener)
    if (document.getElementById("panelUndoRedoPeta")) {
        perbaruiStatusTombolVisual();
        return;
    }

    const panelKontrol = document.createElement("div");
    panelKontrol.id = "panelUndoRedoPeta";
    panelKontrol.style.cssText = `
        position: fixed;
        top: 85px;
        left: 20px;
        z-index: 999999;
        display: flex;
        gap: 8px;
        background: rgba(255, 255, 255, 0.95);
        padding: 6px 10px;
        border-radius: 30px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        border: 1px solid #e2e8f0;
        backdrop-filter: blur(4px);
    `;

    panelKontrol.innerHTML = `
        <button id="btnUndoPeta" title="Undo (Kembali)" style="padding: 6px 14px; border: none; background: #f1f5f9; color: #64748b; border-radius: 20px; font-weight: bold; cursor: not-allowed; font-size: 0.85rem; display: flex; align-items: center; gap: 4px; transition: all 0.2s;" disabled>
            ↩️ Undo
        </button>
        <button id="btnRedoPeta" title="Redo (Majukan)" style="padding: 6px 14px; border: none; background: #f1f5f9; color: #64748b; border-radius: 20px; font-weight: bold; cursor: not-allowed; font-size: 0.85rem; display: flex; align-items: center; gap: 4px; transition: all 0.2s;" disabled>
            Redo ↪️
        </button>
    `;

    document.body.appendChild(panelKontrol);

    const btnUndo = document.getElementById("btnUndoPeta");
    const btnRedo = document.getElementById("btnRedoPeta");

    // Eksekusi Logika Undo
    btnUndo.onclick = function() {
        if (riwayatUndo.length === 0 || !fungsiUpdateKoordinatGlobal) return;

        const aksiTerakhir = riwayatUndo.pop();
        riwayatRedo.push(aksiTerakhir);

        aksiTerakhir.forEach(item => {
            const kotak = document.querySelector(`[data-id="${item.id}"]`);
            if (kotak) {
                kotak.style.left = `${item.sebelumX}px`;
                kotak.style.top = `${item.sebelumY}px`;
                fungsiUpdateKoordinatGlobal(item.id, item.sebelumX, item.sebelumY);
            }
        });

        perbaruiStatusTombolVisual();
        bersihkanStatusTerpilih(gridPeta);
    };

    // Eksekusi Logika Redo
    btnRedo.onclick = function() {
        if (riwayatRedo.length === 0 || !fungsiUpdateKoordinatGlobal) return;

        const aksiRedo = riwayatRedo.pop();
        riwayatUndo.push(aksiRedo);

        aksiRedo.forEach(item => {
            const kotak = document.querySelector(`[data-id="${item.id}"]`);
            if (kotak) {
                kotak.style.left = `${item.sesudahX}px`;
                kotak.style.top = `${item.sesudahY}px`;
                fungsiUpdateKoordinatGlobal(item.id, item.sesudahX, item.sesudahY);
            }
        });

        perbaruiStatusTombolVisual();
        bersihkanStatusTerpilih(gridPeta);
    };

    perbaruiStatusTombolVisual();
}

function perbaruiStatusTombolVisual() {
    const btnUndo = document.getElementById("btnUndoPeta");
    const btnRedo = document.getElementById("btnRedoPeta");
    if (!btnUndo || !btnRedo) return;

    if (riwayatUndo.length > 0) {
        btnUndo.removeAttribute("disabled");
        btnUndo.style.background = "#3498db";
        btnUndo.style.color = "#ffffff";
        btnUndo.style.cursor = "pointer";
    } else {
        btnUndo.setAttribute("disabled", "true");
        btnUndo.style.background = "#f1f5f9";
        btnUndo.style.color = "#64748b";
        btnUndo.style.cursor = "not-allowed";
    }

    if (riwayatRedo.length > 0) {
        btnRedo.removeAttribute("disabled");
        btnRedo.style.background = "#2ecc71";
        btnRedo.style.color = "#ffffff";
        btnRedo.style.cursor = "pointer";
    } else {
        btnRedo.setAttribute("disabled", "true");
        btnRedo.style.background = "#f1f5f9";
        btnRedo.style.color = "#64748b";
        btnRedo.style.cursor = "not-allowed";
    }
}

// =========================================================================

function warnaiKotakTerpilih(elemenKotak) {
    elemenKotak.style.backgroundColor = "#e74c3c"; 
    elemenKotak.style.outline = "3px solid #c0392b"; 
    elemenKotak.style.boxShadow = "0 0 15px rgba(231, 76, 60, 0.9)";
    elemenKotak.style.zIndex = "99";
}

function bersihkanStatusTerpilih(gridPeta) {
    daftarIdTerpilih = [];
    const semuaKotak = gridPeta.querySelectorAll('.kotak-rumah');
    semuaKotak.forEach(k => {
        k.style.backgroundColor = ""; 
        k.style.outline = "none";
        k.style.boxShadow = "none";
        k.style.zIndex = "1";
    });
}

function tampilkanPopUpDetail(warga, bng, fungsiIsiFormEdit) {
    const overlay = document.createElement("div");
    overlay.className = "modal-detail-overlay"; overlay.id = "customModalDetail";
    overlay.innerHTML = `
        <div class="modal-detail-box">
            <h3>📋 Detail Inputan Bangunan</h3>
            <div class="detail-row"><span class="detail-label">No. Urut Bangunan</span><span class="detail-value" style="font-weight:bold; color:#2c3e50;">${bng}</span></div>
            <div class="detail-row"><span class="detail-label">No. Urut Keluarga</span><span class="detail-value">${warga.no_urut_keluarga || '-'}</span></div>
            <div class="detail-row"><span class="detail-label">Nama Kepala Keluarga</span><span class="detail-value" style="color:#27ae60; font-weight:bold;">${warga.nama_kepala_keluarga}</span></div>
            <div class="detail-row"><span class="detail-label">Blok Rumah</span><span class="detail-value">Blok H - ${warga.blok}</span></div>
            <div class="detail-row"><span class="detail-label">Nomor Rumah</span><span class="detail-value">No. ${warga.no_rumah}</span></div>
            <div class="detail-row"><span class="detail-label">Rukun Tetangga (RT)</span><span class="detail-value">RT. ${warga.rt}</span></div>
            <div class="detail-row"><span class="detail-label">Rukun Warga (RW)</span><span class="detail-value">RW. ${warga.rw}</span></div>
            <div class="modal-actions">
                <button class="btn-modal-close" id="closeModalBtn">Tutup</button>
                <button class="btn-modal-edit" id="editFromModalBtn">Edit Data</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById("closeModalBtn").addEventListener("click", () => overlay.remove());
    document.getElementById("editFromModalBtn").addEventListener("click", () => { overlay.remove(); fungsiIsiFormEdit(warga.id); });
    overlay.addEventListener("click", (e) => { if (e.target.id === "customModalDetail") overlay.remove(); });
}