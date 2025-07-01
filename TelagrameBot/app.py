from flask import Flask, request, jsonify
import requests
import json
import re
from datetime import datetime, timedelta
import os
from urllib.parse import quote
from dotenv import load_dotenv

app = Flask(__name__)

# Load variables from .env
load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
WEBHOOK_URL = os.getenv("WEBHOOK_URL")
# Configuration - Replace with your actual tokens
  # Your deployed Flask app URL + /webhook

# Airport codes mapping
AIRPORT_CODES = {
    'chennai': 'MAA',
    'mumbai': 'BOM', 
    'bangalore': 'BLR',
    'delhi': 'DEL',
    'kolkata': 'CCU',
    'hyderabad': 'HYD',
    'pune': 'PNQ',
    'ahmedabad': 'AMD',
    'goa': 'GOI',
    'kochi': 'COK',
    'jaipur': 'JAI',
    'lucknow': 'LKO',
    'indore': 'IDR',
    'bhubaneswar': 'BBI',
    'coimbatore': 'CJB',
    'madurai': 'IXM',
    'trivandrum': 'TRV',
    'calicut': 'CCJ',
    'vijayawada': 'VGA',
    'tirupati': 'TIR',
    'nashik': 'ISK',
    'udaipur': 'UDR',
    'salem': 'SXV',
    'selam': 'SXV'
}

CODEMAGEN_CONTEXT = """You are an AI assistant for Codemagen Technologies Private Limited, a travel-tech company. Here's important information about the company:

COMPANY OVERVIEW:
- Full Name: Codemagen Technologies Private Limited
- Incorporated: January 4, 2024 in Mumbai, Maharashtra
- Industry: Travel technology solutions provider
- Headquarters: Mumbai with presence in Bangalore
- Team Size: 1-10 employees (as of early 2025)
- Paid-up Capital: ₹100,000
- Status: Active, privately held Indian company
- NIC Code: 7912 (Travel agency/tour operator technology)

FOUNDERS & LEADERSHIP:
- Sufail Zakir Husain – Director & Co-founder
- Kishanvir – Director & Co-founder
- Both appointed on incorporation date: January 4, 2024

PRODUCTS & SERVICES:
1. Advanced Booking Engines:
   - Tailored specifically for travel companies
   - Optimized for conversion and user experience
   - Designed for hotels, airlines, resorts, and travel businesses

2. Dynamic Revenue & Inventory Management:
   - Real-time pricing optimization
   - Availability management systems
   - Revenue maximization tools

3. Custom Travel CRMs:
   - Guest interaction management
   - Streamlined operations for travel businesses
   - Industry-specific features

FLIGHT SEARCH CAPABILITY:
You can help users search for flights using Codemagen's flight booking system. When users ask about flights, extract the origin, destination, and travel date from their message, then provide a direct link to search results.

ACCOUNT PAGE NAVIGATION:
You can help users navigate to different account pages:
- Booking/My Bookings: https://www.codemagen.net/myaccounts/bookings
- Account/Statement: https://www.codemagen.net/myaccounts/accounts  
- Profile: https://www.codemagen.net/myaccounts/profile

Always respond in a helpful, professional manner representing Codemagen."""

def generate_flight_search_url(origin, destination, travel_date, passengers=1, class_type='ECONOMY'):
    """Generate flight search URL"""
    origin_code = AIRPORT_CODES.get(origin.lower(), origin.upper())
    dest_code = AIRPORT_CODES.get(destination.lower(), destination.upper())
    
    return f"https://www.codemagen.net/flights/oneway?adult_count={passengers}&child_count=0&class_type={class_type}&destination={dest_code}&destinationCountry=IN&host_search=false&infant_count=0&non_stop=false&origin={origin_code}&originCountry=IN&search_type=one_way&travel_date={travel_date}"

def format_date_for_url(date):
    """Format date for URL (YYYY-MM-DD)"""
    return date.strftime('%Y-%m-%d')

def format_date_to_standard(date):
    """Format date for display (DD/MM/YYYY)"""
    return date.strftime('%d/%m/%Y')

def get_tomorrow_date():
    """Get tomorrow's date"""
    return datetime.now() + timedelta(days=1)

def get_next_week_monday():
    """Get next Monday's date"""
    today = datetime.now()
    days_ahead = 0 - today.weekday() + 7  # Monday is 0
    return today + timedelta(days=days_ahead)

def parse_custom_date(date_str):
    """Parse various date formats"""
    current_year = datetime.now().year
    
    # Handle formats like 7/8/25, 07/08/25, 7/8/2025
    patterns = [
        r'^(\d{1,2})/(\d{1,2})/(\d{2,4})$',
        r'^(\d{1,2})-(\d{1,2})-(\d{2,4})$'
    ]
    
    for pattern in patterns:
        match = re.match(pattern, date_str)
        if match:
            day = int(match.group(1))
            month = int(match.group(2))
            year = int(match.group(3))
            
            # Handle 2-digit years
            if year < 100:
                year += 2000 if year < 50 else 1900
            
            try:
                return datetime(year, month, day)
            except ValueError:
                continue
    
    # Handle formats with month names
    month_map = {
        'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
        'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6,
        'jul': 7, 'july': 7, 'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
        'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12
    }
    
    month_patterns = [
        r'^(\d{1,2})/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/(\d{2,4})$',
        r'^(\d{1,2})/(january|february|march|april|may|june|july|august|september|october|november|december)/(\d{2,4})$'
    ]
    
    for pattern in month_patterns:
        match = re.match(pattern, date_str.lower())
        if match:
            day = int(match.group(1))
            month = month_map[match.group(2)]
            year = int(match.group(3))
            
            if year < 100:
                year += 2000 if year < 50 else 1900
            
            try:
                return datetime(year, month, day)
            except ValueError:
                continue
    
    return None

def get_date_from_text(text):
    """Extract date from text message"""
    lower_text = text.lower()
    
    # Handle "tomorrow"
    if 'tomorrow' in lower_text or 'tommorow' in lower_text:
        return get_tomorrow_date()
    
    # Handle "next week monday"
    if 'next week' in lower_text and 'monday' in lower_text:
        return get_next_week_monday()
    
    # Handle specific date formats
    date_patterns = [
        r'(\d{1,2}/\d{1,2}/\d{2,4})',
        r'(\d{1,2}-\d{1,2}-\d{2,4})',
        r'(\d{1,2}/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/\d{2,4})',
        r'(\d{1,2}/(?:january|february|march|april|may|june|july|august|september|october|november|december)/\d{2,4})'
    ]
    
    for pattern in date_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            parsed_date = parse_custom_date(matches[0])
            if parsed_date:
                return parsed_date
    
    # Handle simple patterns like "6 jul", "july 6"
    month_map = {
        'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
        'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6,
        'jul': 7, 'july': 7, 'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
        'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12
    }
    
    simple_patterns = [
        r'(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)',
        r'(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)',
        r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})',
        r'(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})'
    ]
    
    for pattern in simple_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            if match.group(1).isdigit():
                day = int(match.group(1))
                month = month_map[match.group(2).lower()]
            else:
                month = month_map[match.group(1).lower()]
                day = int(match.group(2))
            
            if 1 <= day <= 31:
                current_year = datetime.now().year
                try:
                    date = datetime(current_year, month, day)
                    if date < datetime.now():
                        date = datetime(current_year + 1, month, day)
                    return date
                except ValueError:
                    continue
    
    return get_tomorrow_date()  # Default to tomorrow

def check_account_page_request(message):
    """Check if message is requesting account page access"""
    lower_message = message.lower()
    
    # Check for booking related requests
    booking_keywords = ['booking', 'bookings', 'my booking', 'my bookings', 'booking page']
    if any(keyword in lower_message for keyword in booking_keywords):
        return {
            'type': 'booking',
            'url': 'https://www.codemagen.net/myaccounts/bookings',
            'display_text': 'My Bookings'
        }
    
    # Check for account/statement related requests
    account_keywords = ['account', 'accounts', 'statement', 'account page', 'statement page']
    if any(keyword in lower_message for keyword in account_keywords):
        return {
            'type': 'account',
            'url': 'https://www.codemagen.net/myaccounts/accounts',
            'display_text': 'Account Statement'
        }
    
    # Check for profile related requests
    profile_keywords = ['profile', 'my profile', 'profile page']
    if any(keyword in lower_message for keyword in profile_keywords):
        return {
            'type': 'profile',
            'url': 'https://www.codemagen.net/myaccounts/profile',
            'display_text': 'My Profile'
        }
    
    return None

def extract_flight_search_info(message):
    """Extract flight search information from message"""
    lower_message = message.lower()
    origin = ''
    destination = ''
    travel_date = None
    
    # Extract cities
    cities = list(AIRPORT_CODES.keys())
    found_cities = [city for city in cities if city in lower_message]
    
    # Common patterns for origin-destination
    patterns = [
        r'(?:from\s+)?(\w+)\s+to\s+(\w+)',
        r'(\w+)\s+to\s+(\w+)',
        r'(\w+)\s*-\s*(\w+)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            city1 = match.group(1).lower()
            city2 = match.group(2).lower()
            
            if city1 in cities and city2 in cities:
                origin = city1
                destination = city2
                break
    
    # If no pattern match, use found cities in order
    if not origin and not destination and len(found_cities) >= 2:
        origin = found_cities[0]
        destination = found_cities[1]
    
    # Extract travel date
    travel_date = get_date_from_text(message)
    
    return {'origin': origin, 'destination': destination, 'travel_date': travel_date}

def call_groq_api(user_message):
    """Call Groq API for AI response"""
    # Check if this is an account page request
    account_page_request = check_account_page_request(user_message)
    if account_page_request:
        page_type = account_page_request['type']
        url = account_page_request['url']
        display_text = account_page_request['display_text']
        
        emoji = '📋'
        description = ''
        
        if page_type == 'booking':
            emoji = '✈️'
            description = 'View and manage all your flight bookings, hotel reservations, and travel itineraries in one place.'
        elif page_type == 'account':
            emoji = '💳'
            description = 'Check your account balance, transaction history, and payment statements.'
        elif page_type == 'profile':
            emoji = '👤'
            description = 'Update your personal information, travel preferences, and account settings.'
        
        return f"{emoji} *{display_text}*\n\n{description}\n\n🔗 [Go to {display_text}]({url})\n\nClick the link above to access your {display_text.lower()} page. You'll need to sign in to your Codemagen account if you haven't already.\n\nNeed help with anything else? I can assist with flight searches, hotel bookings, or answer questions about Codemagen's services!"
    
    # Check if this is a flight search request
    flight_keywords = ['flight', 'flights', 'fly', 'travel', 'book', 'search', 'list']
    contains_flight_keyword = any(keyword in user_message.lower() for keyword in flight_keywords)
    
    flight_info = extract_flight_search_info(user_message)
    origin = flight_info['origin']
    destination = flight_info['destination']
    travel_date = flight_info['travel_date']
    
    if contains_flight_keyword and origin and destination and travel_date:
        url_date = format_date_for_url(travel_date)
        display_date = format_date_to_standard(travel_date)
        flight_url = generate_flight_search_url(origin, destination, url_date)
        
        origin_display = origin.capitalize()
        destination_display = destination.capitalize()
        origin_code = AIRPORT_CODES[origin]
        dest_code = AIRPORT_CODES[destination]
        
        short_url = f"codemagen.net/flights → {origin_code} to {dest_code}"
        
        return f"🛫 *Flight Search Results*\n\n*Route:* {origin_display} ({origin_code}) → {destination_display} ({dest_code})\n*Travel Date:* {display_date}\n*Class:* Economy\n*Passengers:* 1 Adult\n\n✈️ [Search Available Flights: {short_url}]({flight_url})\n\nClick the link above to view all available flights for your selected route and date. You can modify passengers, class type, and other preferences on the search page.\n\nNeed help with return flights, hotels, or have questions about Codemagen's services?"
    
    # Call Groq API for general queries
    try:
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {GROQ_API_KEY}'
        }
        
        data = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {
                    "role": "system",
                    "content": CODEMAGEN_CONTEXT
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        response = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            return result['choices'][0]['message']['content']
        else:
            return f"Sorry, I encountered an error: {response.status_code}. Please try again later."
            
    except Exception as e:
        return f"Sorry, I encountered an error: {str(e)}. Please try again later."

def send_telegram_message(chat_id, text):
    """Send message to Telegram"""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'Markdown',
        'disable_web_page_preview': False
    }
    
    try:
        response = requests.post(url, json=data, timeout=10)
        return response.json()
    except Exception as e:
        print(f"Error sending message: {e}")
        return None

@app.route('/webhook', methods=['POST'])
def webhook():
    """Handle incoming Telegram messages"""
    try:
        update = request.get_json()
        
        if 'message' in update:
            message = update['message']
            chat_id = message['chat']['id']
            
            if 'text' in message:
                user_message = message['text']
                
                # Handle /start command
                if user_message == '/start':
                    welcome_message = """👋 Hello! I'm Codemagen's AI assistant. 

I can help you with:
✈️ Flight searches and bookings
🏨 Hotel reservations
📋 Account management
💼 Travel-tech solutions

What would you like to know about our services?"""
                    send_telegram_message(chat_id, welcome_message)
                    return jsonify({'status': 'ok'})
                
                # Get AI response
                bot_response = call_groq_api(user_message)
                
                # Send response
                send_telegram_message(chat_id, bot_response)
        
        return jsonify({'status': 'ok'})
        
    except Exception as e:
        print(f"Webhook error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/set_webhook', methods=['GET'])
def set_webhook():
    """Set up the webhook URL"""
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook"
    data = {'url': f"{WEBHOOK_URL}/webhook"}
    
    try:
        response = requests.post(url, json=data)
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'Codemagen Telegram Bot'})

@app.route('/', methods=['GET'])
def home():
    """Home endpoint"""
    return jsonify({
        'service': 'Codemagen Telegram Bot API',
        'status': 'running',
        'endpoints': {
            'webhook': '/webhook',
            'set_webhook': '/set_webhook',
            'health': '/health'
        }
    })

if __name__ == '__main__':
    # For development
    # app.run(debug=True, host='0.0.0.0', port=5000)
    app.run(host='0.0.0.0', port=8000)
