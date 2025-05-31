from flask import Flask, request, jsonify
from HttpStatus import HttpStatus
import pymysql
import redis as rd
import json
import os

app = Flask(__name__)

# Initialize Redis client
redis_client = rd.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    decode_responses=True
)

@app.route('/record', methods=['POST'])
def record_message():
    data = request.get_json()
    if data is None:
        return jsonify({"error": "Invalid JSON"}), HttpStatus.BAD_REQUEST.value
    
    message = data.get('message')
    user_id_send = data.get('userIdSend')
    user_id_receive = data.get('userIdReceive')

    # Store message in Redis
    redis_key = f"Cache:{user_id_send}:{user_id_receive}"

    # Check if the message already exists in Redis
    cached_data = redis_client.get(redis_key)
    if cached_data:
        cached_json = json.loads(cached_data)
        if (
            cached_json.get("message") == message and
            cached_json.get("userIdSend") == user_id_send and
            cached_json.get("userIdReceive") == user_id_receive
        ):
            return jsonify(cached_json), HttpStatus.OK.value

    if not message or not user_id_send or not user_id_receive:
        return jsonify({"error": "Missing required fields"}), HttpStatus.BAD_REQUEST.value
    
    try:
        # Create table if it does not exist
        createTableIfNotExists()

        connection = connectToDatabase()
        cursor = connection.cursor()
        query = "INSERT INTO messages (message, user_id_send, user_id_receive) VALUES (%s, %s, %s)"
        cursor.execute(query, (message, user_id_send, user_id_receive))
        connection.commit()

        # Store the message in Redis
        redis_client.set(redis_key, json.dumps({
            "message": message,
            "userIdSend": user_id_send,
            "userIdReceive": user_id_receive
        }), ex=300)

    except pymysql.Error as err:
        print(f"Error: {err}")
        return jsonify({"error": str(err)}), 500
    finally:
        cursor.close()
        connection.close()

    return jsonify({"message": "ok"}), HttpStatus.OK.value


def connectToDatabase():
    connection = pymysql.connect(
        host=os.getenv('MYSQL_HOST', 'localhost'),
        user=os.getenv('MYSQL_USER', 'root'),
        passwd=os.getenv('MYSQL_PASSWORD', ''),
        db=os.getenv('MYSQL_DB', 'Message'),
        cursorclass=pymysql.cursors.DictCursor
    )
    return connection

def createTableIfNotExists():
    connection = connectToDatabase()
    cursor = connection.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS messages (
            message_id INT AUTO_INCREMENT PRIMARY KEY,
            message TEXT NOT NULL,
            user_id_send INT NOT NULL,
            user_id_receive INT NOT NULL
        )default charset=utf8mb4;
        """
    )
    connection.commit()
    cursor.close()


if __name__ == '__main__':
    app.run(debug=True,host='0.0.0.0' ,port=5000)
