from flask import Flask, request, jsonify
from HttpStatus import HttpStatus
import mysql.connector as mysql

app = Flask(__name__)

@app.route('/record', methods=['POST'])
def record_message():

    data = request.get_json()
    if data is None:
        return jsonify({"error": "Invalid JSON"}), HttpStatus.BAD_REQUEST.value
    
    message = data.get('message')
    user_id_send = data.get('userIdSend')
    user_id_receive = data.get('userIdReceive')

    if not message or not user_id_send or not user_id_receive:
        return jsonify({"error": "Missing required fields"}), HttpStatus.BAD_REQUEST.value
    
    conecction = connectToDatabase()

    return jsonify({"message": message}), HttpStatus.OK.value


def connectToDatabase():
    connection = mysql.connect(host="localhost", user="root", passwd="vi@@2022", db="Message")
    cursor = connection.cursor()
    


if __name__ == '__main__':
    app.run(debug=True, port=5000)