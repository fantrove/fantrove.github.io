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