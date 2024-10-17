from flask import Flask, render_template, jsonify, request
from selenium.webdriver.common.action_chains import ActionChains
from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
import time
import urllib.parse
import os

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/autoSend')
def autoSend():
    global data_storage
    return render_template('auto-send.html', data=data_storage)


@app.route('/competition')
def competition():
    return render_template('competition.html')


@app.route('/dataCompetition')
def dataCompetition():
    return render_template('data-competition.html')


@app.route('/dataDelegation')
def dataDelegation():
    return render_template('data-delegation.html')


@app.route('/dataStock')
def dataStock():
    return render_template('data-stock.html')


@app.route('/inputForm')
def inputForm():
    return render_template('input-form.html')


@app.route('/inputSiswa')
def inputSiswa():
    return render_template('input-siswa.html')


data_storage = []  # Menyimpan data di memori (bisa disimpan di database jika diperlukan)

@app.route('/save_data', methods=['POST'])
def save_data():
    global data_storage
    incoming_data = request.json.get('data', [])
    data_storage = incoming_data
    return jsonify({'status': 'success', 'message': 'Data saved.'})

@app.route('/get_saved_data', methods=['GET'])
def get_saved_data():
    return jsonify(data_storage)


@app.route('/delete_data', methods=['DELETE'])
def delete_data():
    global data_storage
    data_storage.clear()  # Hapus semua data dari memori
    return jsonify({'status': 'success', 'message': 'All data deleted.'})


def read_message_template():
    template_path = 'WHATSDRAFT.txt'
    if not os.path.exists(template_path):
        print("Template file not found.")
        return "Message template not found."
    with open(template_path, 'r', encoding='utf-8') as file:
        return file.read()


def send_whatsapp_message(contact, name, file_link):
    message_template = read_message_template()
    message = message_template.format(name=name, file_link=file_link)
    message = urllib.parse.quote(message)  # URL encode the message

    options = webdriver.ChromeOptions()
    service = Service(executable_path='C:/ChromeDriver/chromedriver.exe')

    options.add_argument("user-data-dir=C:/ChromeDriver")  # Path ke profil Chrome
    options.add_argument("profile-directory=Default")

    try:
        driver = webdriver.Chrome(service=service, options=options)
        whatsapp_url = f'https://web.whatsapp.com/send?phone={contact}&text={message}'
        driver.get(whatsapp_url)

        # Tunggu hingga input box tersedia dan dapat digunakan
        sending_message = WebDriverWait(driver, 60).until(
            EC.presence_of_element_located((By.XPATH, '//button[@aria-label="Kirim"]'))
        )

        sending_message.send_keys(Keys.ENTER)
        time.sleep(10)  # Tunggu beberapa detik untuk memastikan pesan terkirim
        return True


    except (TimeoutException, WebDriverException) as e:
        print(f"Error sending message to {contact}: {e}")
        return False
    finally:
        driver.quit()


@app.route('/send_messages', methods=['POST'])
def send_messages():
    data = request.json  # Ambil data yang dikirim dari frontend
    print(data)  # Debugging: cetak data yang diterima

    # Pastikan data adalah list (array) dari dict (objek)
    if isinstance(data, dict) and 'data' in data:
        rows = data['data']
    else:
        return jsonify({'status': 'error', 'message': 'Invalid data format'}), 400

    # Update status pengiriman untuk setiap kontak
    updated_rows = []
    for row in rows:
        name = row.get('Name', '')
        contact = row.get('Contact', '')
        file_link = row.get('File', '')
        success = send_whatsapp_message(contact, name, file_link)
        row['Status'] = 'Sent' if success else 'Failed'
        updated_rows.append(row)

    return jsonify({'status': 'success', 'updatedData': updated_rows})


if __name__ == '__main__':
    app.run(debug=True)