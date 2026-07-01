
import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from paddleocr import PaddleOCR
from db import save_record, get_all_records
from groq import Groq
from dotenv import load_dotenv
import os
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app, resources={r"/*": {"origins": "*"}})

ocr = PaddleOCR(use_textline_orientation=True, lang='en')

groq_client = Groq(api_key=GROQ_API_KEY)

def categorize_with_groq(text):
    chat_completion = groq_client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": f"""Extract financial information from this receipt text and return ONLY a JSON object with these fields:
- vendor (store or restaurant name)
- date (date of purchase)
- total (final amount paid)
- category (one of: Food & Dining, Shopping, Transport, Bills & Utilities, Healthcare, Other)

Receipt text:
{text}

Return ONLY the JSON, no explanation, no markdown."""
            }
        ],
        model="llama-3.3-70b-versatile",
    )
    return chat_completion.choices[0].message.content

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/ocr', methods=['POST'])
def extract_text():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    image = request.files['image']
    image_path = f"/tmp/temp_{image.filename}"
    image.save(image_path)

    result = ocr.ocr(image_path)

    extracted_text = []
    for item in result:
        if isinstance(item, dict) and 'rec_texts' in item:
            extracted_text.extend(item['rec_texts'])

    full_text = ' '.join(extracted_text)

    categorized = categorize_with_groq(full_text)

    try:
        clean = categorized.strip().replace('```json', '').replace('```', '')
        categorized_data = json.loads(clean)
    except:
        categorized_data = {'raw': categorized}

    record = {
        'raw_text': full_text,
        'vendor': categorized_data.get('vendor', 'Unknown'),
        'date': categorized_data.get('date', 'Unknown'),
        'total': categorized_data.get('total', 'Unknown'),
        'category': categorized_data.get('category', 'Other'),
        'status': 'categorized'
    }

    record_id = save_record(record)

    return jsonify({
        'text': full_text,
        'categorized': categorized_data,
        'record_id': record_id
    })

@app.route('/records', methods=['GET'])
def get_records():
    records = get_all_records()
    return jsonify(records)

@app.route('/records/<record_id>', methods=['DELETE'])
def delete_record(record_id):
    from db import records_collection
    from bson import ObjectId
    records_collection.delete_one({'_id': ObjectId(record_id)})
    return jsonify({'success': True})

@app.route('/records/<record_id>', methods=['PUT'])
def update_record(record_id):
    from db import records_collection
    from bson import ObjectId
    data = request.json
    records_collection.update_one(
        {'_id': ObjectId(record_id)},
        {'$set': {
            'vendor': data.get('vendor'),
            'date': data.get('date'),
            'total': data.get('total'),
            'category': data.get('category')
        }}
    )
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, port=5000)