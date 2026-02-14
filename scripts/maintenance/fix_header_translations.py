import json
from pathlib import Path
import os

def fix_header_tags():
    base_dir = Path(__file__).resolve().parents[2]
    frontend_group = os.getenv('FRONTEND_GROUP', 'crm').strip().lower()
    if frontend_group not in {'crm', 'site'}:
        frontend_group = 'crm'
    locales_dir = base_dir / frontend_group / 'frontend' / 'src' / 'locales'
    
    # Reference translations
    header_translations = {
        'ru': {
            'homeTag': 'Главная',
            'servicesTag': 'Услуги',
            'portfolioTag': 'Портфолио',
            'teamTag': 'Команда',
            'testimonialsTag': 'Отзывы',
            'faqTag': 'FAQ',
            'contactsTag': 'Контакты'
        },
        'en': {
            'homeTag': 'Home',
            'servicesTag': 'Services',
            'portfolioTag': 'Portfolio',
            'teamTag': 'Team',
            'testimonialsTag': 'Reviews',
            'faqTag': 'FAQ',
            'contactsTag': 'Contacts'
        },
        'es': {
            'homeTag': 'Inicio',
            'servicesTag': 'Servicios',
            'portfolioTag': 'Portafolio',
            'teamTag': 'Equipo',
            'testimonialsTag': 'Reseñas',
            'faqTag': 'FAQ',
            'contactsTag': 'Contactos'
        },
        'fr': {
            'homeTag': 'Accueil',
            'servicesTag': 'Services',
            'portfolioTag': 'Portfolio',
            'teamTag': 'Équipe',
            'testimonialsTag': 'Avis',
            'faqTag': 'FAQ',
            'contactsTag': 'Contacts'
        },
        'de': {
            'homeTag': 'Startseite',
            'servicesTag': 'Dienstleistungen',
            'portfolioTag': 'Portfolio',
            'teamTag': 'Team',
            'testimonialsTag': 'Bewertungen',
            'faqTag': 'FAQ',
            'contactsTag': 'Kontakte'
        },
        'ar': {
            'homeTag': 'الرئيسية',
            'servicesTag': 'الخدمات',
            'portfolioTag': 'المعرض',
            'teamTag': 'الفريق',
            'testimonialsTag': 'الآراء',
            'faqTag': 'الأسئلة الشائعة',
            'contactsTag': 'اتصل بنا'
        },
        'hi': {
            'homeTag': 'मुख्य पृष्ठ',
            'servicesTag': 'सेवाएं',
            'portfolioTag': 'पोर्टफोलियो',
            'teamTag': 'टीम',
            'testimonialsTag': 'समीक्षाएं',
            'faqTag': 'सामान्य प्रश्न',
            'contactsTag': 'संपर्क'
        },
        'kk': {
            'homeTag': 'Басты бет',
            'servicesTag': 'Қызметтер',
            'portfolioTag': 'Портфолио',
            'teamTag': 'Команда',
            'testimonialsTag': 'Пікірлер',
            'faqTag': 'Жиі қойылатын сұрақтар',
            'contactsTag': 'Байланыс'
        },
        'pt': {
            'homeTag': 'Início',
            'servicesTag': 'Serviços',
            'portfolioTag': 'Portfólio',
            'teamTag': 'Equipe',
            'testimonialsTag': 'Avaliações',
            'faqTag': 'FAQ',
            'contactsTag': 'Contatos'
        }
    }
    
    for lang, tags in header_translations.items():
        lang_dir = locales_dir / lang
        if not lang_dir.exists(): continue
        
        file_path = lang_dir / 'public_landing.json'
        if not file_path.exists(): 
            print(f"File not found: {file_path}")
            # Create if missing and we have data
            data = {}
        else:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        
        updated = False
        for k, v in tags.items():
            if data.get(k) != v:
                data[k] = v
                updated = True
        
        if updated:
            print(f"Updating {lang}/public_landing.json header tags...")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)

if __name__ == "__main__":
    fix_header_tags()
