import sys
import os
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

import os
from db.connection import get_db_connection
from core.config import DATABASE_NAME
from utils.logger import log_info

def seed_public_content(db_path=DATABASE_NAME):
    """Seed public content (FAQ, Reviews)"""
    conn = get_db_connection()
    c = conn.cursor()

    # 1. Seed FAQ
    # Data from frontend/src/locales/ru/public/faq.json
    faqs = [
        ("booking", "Как записаться на процедуру", "Вы можете записаться на процедуру через форму на нашем сайте, позвонив по телефону, или написав нам в Instagram. Мы свяжемся с вами для подтверждения записи."),
        ("payment", "Какие способы оплаты вы принимаете", "Мы принимаем оплату наличными и картами (Visa, MasterCard, American Express). Оплата производится после оказания услуги."),
        ("cancellation", "Могу ли я отменить или перенести запись", "Да, вы можете отменить или перенести запись не позднее чем за 24 часа до назначенного времени. При отмене менее чем за 24 часа может взиматься штраф в размере 50% от стоимости услуги."),
        ("materials", "Какие материалы вы используете", "Мы используем только сертифицированные премиальные материалы от ведущих мировых брендов. Все пигменты гипоаллергенны и безопасны для здоровья."),
        ("certificates", "Есть ли у ваших мастеров сертификаты", "Да, все наши мастера имеют международные сертификаты и регулярно проходят курсы повышения квалификации."),
        ("preparation", "Нужна ли подготовка перед процедурой", "Да, для некоторых процедур требуется подготовка. Детальные рекомендации мы предоставляем при записи."),
        ("contraindications", "Есть ли противопоказания к процедурам", "Да, у каждой процедуры есть свои противопоказания. Основные: беременность, лактация, острые воспалительные процессы, заболевания крови, онкология. Перед процедурой обязательна консультация с мастером."),
        ("guarantee", "Предоставляете ли вы гарантию на услуги", "Да, мы гарантируем качество всех наших услуг. Если вы не удовлетворены результатом, свяжитесь с нами в течение 7 дней, и мы найдем решение."),
        ("loyalty", "Есть ли у вас программа лояльности", "Да, у нас есть накопительная программа лояльности. После каждого посещения вы получаете бонусы, которые можно использовать для оплаты следующих визитов."),
        ("weekends", "Работаете ли вы в выходные", "Да, мы работаем 7 дней в неделю."),
        ("gift", "Можно ли подарить сертификат на услуги", "Да, мы предлагаем подарочные сертификаты на любую сумму или на конкретные услуги. Свяжитесь с нами для оформления сертификата."),
        ("location", "Где находится ваш салон", "Мы находимся в центре Дубая. Подробную информацию о том, как добраться, вы можете найти на странице Контакты.")
    ]

    log_info("Seeding FAQ...", "migration")
    for i, (category, question, answer) in enumerate(faqs):
        # Check if exists
        c.execute("SELECT id FROM public_faq WHERE question_ru = %s", (question,))
        if not c.fetchone():
            c.execute("""
                INSERT INTO public_faq (category, question_ru, answer_ru, display_order)
                VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
    """, (category, question, answer, i))

    # 2. Seed Reviews
    # Realistic reviews for a beauty salon in Dubai (only 5-star reviews)
    # Format: (Author, Rating, Text, Avatar, Service)
    reviews = [
        ("Anna Petrova", 5, "Потрясающий салон! Мастера - настоящие профессионалы. Делала перманентный макияж бровей, результат превзошел все ожидания. Очень естественно и красиво.", "anna_p.jpg", "Permanent Makeup"),
        ("Sarah Jenkins", 5, "Best beauty salon in Dubai! The atmosphere is so relaxing and the staff is incredibly friendly. I love my new lashes!", "sarah_j.jpg", "Eyelashes"),
        ("Elena Smirnova", 5, "Хожу сюда уже год на маникюр и педикюр. Всегда идеально чисто, стерильно и качественно. Рекомендую всем подругам!", "elena_s.jpg", "Manicure & Pedicure"),
        ("Maria Gonzalez", 5, "Increíble servicio. Me hice un tratamiento facial y mi piel brilla. ¡Volveré seguro!", "maria_g.jpg", "Facial Treatment"),
        ("Fatima Al-Sayed", 5, "Excellent service and professional staff. I did microblading and I am very happy with the result.", "fatima_a.jpg", "Microblading")
    ]

    log_info("Seeding Reviews...", "migration")
    
    import random
    from datetime import datetime, timedelta

    def get_random_date_2026():
        start_date = datetime(2026, 1, 1)
        end_date = datetime(2026, 12, 12) # Up to roughly now-ish or end of year
        time_between_dates = end_date - start_date
        days_between_dates = time_between_dates.days
        random_number_of_days = random.randrange(days_between_dates)
        random_date = start_date + timedelta(days=random_number_of_days)
        return random_date.strftime("%Y-%m-%d %H:%M:%S")

    for i, (author, rating, text, avatar, service) in enumerate(reviews):
        # Generate random date for every iteration
        created_at = get_random_date_2026()
        
        # Check if exists
        c.execute("SELECT id FROM public_reviews WHERE author_name = %s AND text_ru = %s", (author, text))
        row = c.fetchone()
        
        if row:
            # Update existing review to fix date and service
            review_id = row[0]
            c.execute("""
                UPDATE public_reviews 
                SET created_at = %s, employee_position = %s, avatar_url = %s
                WHERE id = %s
            """, (created_at, service, avatar, review_id))
        else:
            # Insert new review
            c.execute("""
                INSERT INTO public_reviews (author_name, rating, text_ru, avatar_url, employee_position, display_order, is_active, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, TRUE, %s)
            ON CONFLICT DO NOTHING
            """, (author, rating, text, avatar, service, i, created_at))

    conn.commit()
    conn.close()
    log_info("Public content seeding completed.", "migration")

if __name__ == "__main__":
    seed_public_content()
