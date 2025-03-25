import time
import pyautogui
import webbrowser

# Open WhatsApp Web
webbrowser.open("https://web.whatsapp.com/")
time.sleep(10)  # Wait for WhatsApp Web to load

# Wait for the user to select the group chat manually
print("Please open the group chat where you want to send messages.")
time.sleep(1)  # Give user time to open the group chat

message = "Certificate??????????????????"
repeat_count = 1000  # Number of times to send
delay_between_messages = 2  # Seconds between messages

for _ in range(repeat_count):
    pyautogui.typewrite(message)
    pyautogui.press("enter")
    time.sleep(delay_between_messages)

print("Messages sent successfully! 🚀")
