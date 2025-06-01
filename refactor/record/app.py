from flask import Flask, request, jsonify
import redis
import json

app = Flask(__name__)
r = redis.Redis(host="redis", port=6379, decode_responses=True)

# POST /message
@app.route('/message', methods=['POST'])
def save_message():
    data = request.json
    key = f"{data['userIdSend']}{data['userIdReceive']}"
    entry = {
        "message": data["message"],
        "user_id_send": data["userIdSend"],
        "user_id_receive": data["userIdReceive"]
    }
    r.rpush(f"history:{key}", json.dumps(entry))
    return jsonify({"status": "ok"})

# GET /message?channel=
@app.route('/message', methods=['GET'])
def get_messages():
    channel = request.args.get('channel')
    messages = r.lrange(f"history:{channel}", 0, -1)
    return jsonify([json.loads(m) for m in messages])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
