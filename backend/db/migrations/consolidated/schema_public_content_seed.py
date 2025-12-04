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
        ("booking", "Как записаться на процедуру%s", "Вы можете записаться на процедуру через форму на нашем сайте, позвонив по телефону, или написав нам в Instagram. Мы свяжемся с вами для подтверждения записи."),
        ("payment", "Какие способы оплаты вы принимаете%s", "Мы принимаем оплату наличными и картами (Visa, MasterCard, American Express). Оплата производится после оказания услуги."),
        ("cancellation", "Могу ли я отменить или перенести запись%s", "Да, вы можете отменить или перенести запись не позднее чем за 24 часа до назначенного времени. При отмене менее чем за 24 часа может взиматься штраф в размере 50% от стоимости услуги."),
        ("materials", "Какие материалы вы используете%s", "Мы используем только сертифицированные премиальные материалы от ведущих мировых брендов. Все пигменты гипоаллергенны и безопасны для здоровья."),
        ("certificates", "Есть ли у ваших мастеров сертификаты%s", "Да, все наши мастера имеют международные сертификаты и регулярно проходят курсы повышения квалификации."),
        ("preparation", "Нужна ли подготовка перед процедурой%s", "Да, для некоторых процедур требуется подготовка. Детальные рекомендации мы предоставляем при записи."),
        ("contraindications", "Есть ли противопоказания к процедурам%s", "Да, у каждой процедуры есть свои противопоказания. Основные: беременность, лактация, острые воспалительные процессы, заболевания крови, онкология. Перед процедурой обязательна консультация с мастером."),
        ("guarantee", "Предоставляете ли вы гарантию на услуги%s", "Да, мы гарантируем качество всех наших услуг. Если вы не удовлетворены результатом, свяжитесь с нами в течение 7 дней, и мы найдем решение."),
        ("loyalty", "Есть ли у вас программа лояльности%s", "Да, у нас есть накопительная программа лояльности. После каждого посещения вы получаете бонусы, которые можно использовать для оплаты следующих визитов."),
        ("weekends", "Работаете ли вы в выходные%s", "Да, мы работаем 7 дней в неделю."),
        ("gift", "Можно ли подарить сертификат на услуги%s", "Да, мы предлагаем подарочные сертификаты на любую сумму или на конкретные услуги. Свяжитесь с нами для оформления сертификата."),
        ("location", "Где находится ваш салон%s", "Мы находимся в центре Дубая. Подробную информацию о том, как добраться, вы можете найти на странице Контакты.")
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
    # Realistic reviews for a beauty salon in Dubai
    reviews = [
        ("Anna Petrova", 5, "Потрясающий салон! Мастера - настоящие профессионалы. Делала перманентный макияж бровей, результат превзошел все ожидания. Очень естественно и красиво.", "anna_p.jpg"),
        ("Sarah Jenkins", 5, "Best beauty salon in Dubai! The atmosphere is so relaxing and the staff is incredibly friendly. I love my new lashes!", "sarah_j.jpg"),
        ("Elena Smirnova", 5, "Хожу сюда уже год на маникюр и педикюр. Всегда идеально чисто, стерильно и качественно. Рекомендую всем подругам!", "elena_s.jpg"),
        ("Maria Gonzalez", 5, "Increíble servicio. Me hice un tratamiento facial y mi piel brilla. ¡Volveré seguro!", "maria_g.jpg"),
        ("Olga Ivanova", 4, "Очень хороший сервис, но сложно записаться на вечернее время. В остальном все супер.", "olga_i.jpg"),
        ("Fatima Al-Sayed", 5, "Excellent service and professional staff. I did microblading and I am very happy with the result.", "fatima_a.jpg")
    ]

    log_info("Seeding Reviews...", "migration")
    for i, (author, rating, text, avatar) in enumerate(reviews):
        # Check if exists
        c.execute("SELECT id FROM public_reviews WHERE author_name = %s AND text_ru = %s", (author, text))
        if not c.fetchone():
            c.execute("""
                INSERT INTO public_reviews (author_name, rating, text_ru, avatar_url, display_order, is_active)
                VALUES (%s, %s, %s, %s, %s, TRUE)
            ON CONFLICT DO NOTHING
    """, (author, rating, text, avatar, i))

    conn.commit()
    conn.close()
    log_info("Public content seeding completed.", "migration")

if __name__ == "__main__":
    seed_public_content()
