import React from 'react';
import { FileText } from 'lucide-react';

export default function Terms() {
  return (
    <div className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-pink-100 rounded-xl flex items-center justify-center">
              <FileText className="w-8 h-8 text-pink-600" />
            </div>
            <h1 className="text-4xl text-gray-900">Условия использования</h1>
          </div>

          <div className="prose prose-pink max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl text-gray-900 mb-4">1. Общие положения</h2>
              <p>
                Настоящие Условия использования регулируют использование услуг Luxury Beauty Salon.
                Используя наши услуги, вы соглашаетесь с данными условиями.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">2. Бронирование и отмена</h2>
              <p>
                Для записи на процедуры необходимо предоставить корректную контактную информацию.
                Мы оставляем за собой право подтвердить или отклонить бронирование.
              </p>
              <p className="mt-3">
                <strong>Отмена записи:</strong> Клиент может отменить запись не позднее чем за 24 часа до назначенного времени.
                При отмене менее чем за 24 часа может взиматься штраф в размере 50% от стоимости услуги.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">3. Оплата услуг</h2>
              <p>
                Оплата производится наличными или картой после оказания услуги. Цены на услуги указаны в прайс-листе
                и могут быть изменены без предварительного уведомления.
              </p>
              <p className="mt-3">
                В случае опоздания клиента более чем на 15 минут, салон оставляет за собой право отменить запись
                или сократить время процедуры.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">4. Медицинские противопоказания</h2>
              <p>
                Клиент обязан сообщить мастеру о наличии любых медицинских противопоказаний, аллергий или
                особенностей здоровья перед проведением процедуры.
              </p>
              <p className="mt-3">
                Салон не несет ответственности за последствия процедур, если клиент скрыл информацию
                о медицинских противопоказаниях.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">5. Гарантии и ответственность</h2>
              <p>
                Мы гарантируем качество используемых материалов и профессионализм наших мастеров.
                Результат процедур может варьироваться в зависимости от индивидуальных особенностей клиента.
              </p>
              <p className="mt-3">
                В случае неудовлетворенности результатом, клиент должен обратиться в салон в течение 7 дней
                для обсуждения возможных вариантов решения.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">6. Конфиденциальность</h2>
              <p>
                Мы уважаем вашу конфиденциальность и обязуемся защищать ваши персональные данные в соответствии
                с нашей <a href="/privacy-policy" className="text-pink-600 hover:underline">Политикой конфиденциальности</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">7. Изменения условий</h2>
              <p>
                Мы оставляем за собой право изменять данные Условия использования в любое время.
                Изменения вступают в силу с момента публикации на сайте.
              </p>
            </section>

            <section>
              <h2 className="text-2xl text-gray-900 mb-4">8. Контакты</h2>
              <p>
                По всем вопросам, связанным с данными Условиями, вы можете связаться с нами:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Телефон: +971 50 123 4567</li>
                <li>Email: info@luxurybeauty.ae</li>
                <li>Адрес: Dubai, UAE</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
            <p>Дата последнего обновления: 19 октября 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
}
