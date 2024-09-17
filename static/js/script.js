const body = document.querySelector("body"),
    modeToggle = document.querySelector(".mode-toggle"),
    sidebar = document.querySelector("nav"),
    sidebarToggle = document.querySelector(".sidebar-toggle");

// Ambil preferensi dari localStorage
let getMode = localStorage.getItem("mode");
let getStatus = localStorage.getItem("status");

// Terapkan mode gelap jika disimpan sebelumnya
if (getMode && getMode === "dark") {
    body.classList.add("dark");  // Terapkan kelas "dark" ke body
}

// Terapkan status sidebar jika disimpan sebelumnya
if (getStatus && getStatus === "close") {
    sidebar.classList.add("close");  // Terapkan kelas "close" ke sidebar
}

// Event listener untuk toggle mode (terang/gelap)
modeToggle.addEventListener("click", () => {
    body.classList.toggle("dark");  // Toggle kelas "dark" pada body

    // Simpan mode saat ini di localStorage
    if (body.classList.contains("dark")) {
        localStorage.setItem("mode", "dark");
    } else {
        localStorage.setItem("mode", "light");
    }
});

// Event listener untuk toggle sidebar (buka/tutup)
sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("close");  // Toggle kelas "close" pada sidebar

    // Simpan status sidebar saat ini di localStorage
    if (sidebar.classList.contains("close")) {
        localStorage.setItem("status", "close");
    } else {
        localStorage.setItem("status", "open");
    }
});


// For Page 2
function loadFile(event) {
    const file = event.target.files[0];
    const fileType = file.type;

    if (fileType === 'text/csv') {
        parseCSV(file);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        parseXLSX(file);
    } else {
        alert('Please upload a valid CSV or XLSX file.');
    }
}

// Fungsi untuk memproses CSV
function parseCSV(file) {
    Papa.parse(file, {
        header: true, // Menentukan apakah file CSV memiliki header
        skipEmptyLines: true, // Melewati baris kosong
        complete: function(results) {
            const data = results.data;
            displayData(data);
        }
    });
}

// Fungsi untuk memproses XLSX
function parseXLSX(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const excelRows = XLSX.utils.sheet_to_json(firstSheet);
        displayData(excelRows);
    };
    reader.readAsArrayBuffer(file);
}


// Fungsi untuk menampilkan data pada elemen yang telah disiapkan
function displayData(data) {
    const tableBody = document.querySelector('#fileTable tbody');
    tableBody.innerHTML = '';  // Kosongkan tabel sebelum diisi ulang

    // Loop melalui setiap item dalam data
    data.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td id="data no">${index + 1}</td>         <!-- No -->
            <td id="data nama">${item.Name}</td>       <!-- Nama -->
            <td id="data contact">${item.Contact}</td> <!-- Contact -->
            <td id="data file">${item.File}</td>       <!-- File -->
            <td id="data status">${item.Status || 'Pending'}</td> <!-- Status -->
        `;
        tableBody.appendChild(tr);
    });

     // Setelah data ditampilkan, simpan data ke backend
    saveDataToBackend(data);
}


function deleteData() {
    const result = confirm("Are you sure you want to delete all data?");
    if (result) {
        fetch('/delete_data', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => response.json())  // Parse respons sebagai JSON
        .then(result => {
            if (result.status === 'success') {
                alert('All data successfully deleted!');
                // Kosongkan tabel setelah penghapusan
                document.querySelector('#fileTable tbody').innerHTML = `
                    <tr><td colspan="5" style="text-align: center;">No data available</td></tr>
                `;
            } else {
                alert('Error deleting data: ' + result.message);
            }
        })
        .catch(error => {
            console.error('Error deleting data:', error.message);
        });
    }
}


function saveDataToBackend(data) {
    fetch('/save_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),  // Kirim data ke backend dalam format JSON
    })
    .then(response => response.json())
    .then(result => {
        alert('Data successfully saved!');
        console.log('Data saved:', result);
    })
    .catch(error => {
        console.error('Error saving data:', error);
    });
}


function getData() {
    fetch('/get_saved_data', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(result => {
        if (result.length > 0) {  // Jika ada data yang tersimpan
            console.log('Data found:', result);
            displayData(result);  // Menampilkan data yang diterima dari backend
        } else {
            console.log('No data availabale.');
            // Tindakan jika tidak ada data, seperti menampilkan pesan
            document.querySelector('#fileTable tbody').innerHTML = `
                <tr><td colspan="6" style="text-align: center;">There is no data availabale</td></tr>
            `;
        }
    })
    .catch(error => {
        console.error('Error mendapatkan data:', error);
    });
}


function sendData() {
    const rows = document.querySelectorAll('#fileTable tbody tr');

    const data = {
        data: []  // Array untuk menyimpan data dari tabel
    };

    // Loop melalui setiap row dalam tabel
    rows.forEach(row => {
        const name = row.cells[1].textContent;   // Kolom ke-2 adalah Nama
        const contact = row.cells[2].textContent; // Kolom ke-3 adalah Contact
        const file = row.cells[3].textContent;    // Kolom ke-4 adalah File

        // Tambahkan data ke array
        data.data.push({
            Name: name,
            Contact: contact,
            File: file
        });
    });

    // Gunakan fetch untuk mengirim data ke Flask
    fetch('/send_messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),  // Konversi objek data ke format JSON
    })
    .then(response => response.json())  // Parse JSON response dari Flask
    .then(result => {
        if (result.status === 'success'){
            alert('Data has been sent successfully!');
            console.log('Success:', result);
            displayData(result.updatedData);
        }
        // Tambahkan logika untuk memproses hasil jika diperlukan
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error sending data!');
    });
}
