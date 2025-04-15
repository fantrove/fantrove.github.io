# ตัวแปรทั้งหมดยังเหมือนเดิมแต่ว่าไวยากรณ์เปลี่ยนแปลงเล็กน้อย
# เมื่อจะเริ่มเขียนปุ่มหลังจะต้องเริ่มต้นด้วย $mainButtons และปุ่มย่อยจะต้องเริ่มต้นด้วย subButtons ซึ่งทั้ง 2 engagement นี้จำเป็นต้องมีในทุกปุ่มปุ่มหลักก็ต้องเริ่มต้นด้วยจุดนั้นกลุ่มย่อยทุกปุ่มต้องเริ่มต้นด้วย subButtons เช่นกัน
$mainButtons:
  en_label "Symbols"
  th_label "สัญลักษณ์"
  isDefault "true"
  url "?main=symbols"
   subButtons:
    en_label "page 1"
    th_label "หน้าที่ 1"
    jsonFile "/assets/json/content/symbols-page1.min.json"
    isDefault "true"
    url "?page=1"
    
   subButtons:
    en_label "2"
    th_label "2"
    jsonFile "/assets/json/content/symbols-page2.min.json"
    url "?page=2"

$mainButtons:
  en_label "Emojis"
  th_label "อีโมจิ"
  isDefault "true"
  url "?main=emojis"
   subButtons:
    en_label "page 1"
    th_label "page 1"
    jsonFile "/assets/json/content/emojis-page1.min.json"
    url "?page=1"

$mainButtons:
  en_label "packets"
  th_label "แพ็คเกจ"
  jsonFile "/assets/json/content/packets.min.json"
  url "?main="packets"