"""
Сервис для генерации PDF документов (договоры, счета)
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from datetime import datetime
import os
from typing import Dict, Any

# Регистрируем русский шрифт
try:
    pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
except:
    # Fallback для других систем
    try:
        pdfmetrics.registerFont(TTFont('DejaVuSans', 'DejaVuSans.ttf'))
        pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', 'DejaVuSans-Bold.ttf'))
    except:
        print("Warning: DejaVu fonts not found, using default fonts")

class PDFGenerator:
    """Генератор PDF документов"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_styles()
    
    def _setup_styles(self):
        """Настроить стили для русского текста"""
        try:
            self.styles.add(ParagraphStyle(
                name='RussianTitle',
                parent=self.styles['Title'],
                fontName='DejaVuSans-Bold',
                fontSize=18,
                alignment=1,  # CENTER
                spaceAfter=20
            ))
            
            self.styles.add(ParagraphStyle(
                name='RussianHeading',
                parent=self.styles['Heading1'],
                fontName='DejaVuSans-Bold',
                fontSize=14,
                spaceAfter=12
            ))
            
            self.styles.add(ParagraphStyle(
                name='RussianNormal',
                parent=self.styles['Normal'],
                fontName='DejaVuSans',
                fontSize=11,
                spaceAfter=6
            ))
        except:
            # Fallback на стандартные стили
            self.styles.add(ParagraphStyle(
                name='RussianTitle',
                parent=self.styles['Title'],
                fontSize=18,
                alignment=1,
                spaceAfter=20
            ))
            
            self.styles.add(ParagraphStyle(
                name='RussianHeading',
                parent=self.styles['Heading1'],
                fontSize=14,
                spaceAfter=12
            ))
            
            self.styles.add(ParagraphStyle(
                name='RussianNormal',
                parent=self.styles['Normal'],
                fontSize=11,
                spaceAfter=6
            ))
    
    def generate_contract_pdf(self, contract_data: Dict[str, Any], output_path: str) -> str:
        """
        Генерировать PDF договора
        
        Args:
            contract_data: Данные договора
            output_path: Путь для сохранения PDF
            
        Returns:
            Путь к созданному файлу
        """
        doc = SimpleDocTemplate(output_path, pagesize=A4)
        story = []
        
        # Заголовок
        title = Paragraph(f"ДОГОВОР № {contract_data.get('contract_number', 'N/A')}", self.styles['RussianTitle'])
        story.append(title)
        story.append(Spacer(1, 12))
        
        # Дата и место
        date_text = f"г. {contract_data.get('city', 'Москва')}, {contract_data.get('start_date', datetime.now().strftime('%d.%m.%Y'))}"
        story.append(Paragraph(date_text, self.styles['RussianNormal']))
        story.append(Spacer(1, 12))
        
        # Стороны договора
        story.append(Paragraph("СТОРОНЫ ДОГОВОРА:", self.styles['RussianHeading']))
        
        # Исполнитель
        executor_text = f"""
        <b>ИСПОЛНИТЕЛЬ:</b> {contract_data.get('company_name', 'ООО "Компания"')}<br/>
        ИНН: {contract_data.get('company_inn', '')}<br/>
        Адрес: {contract_data.get('company_address', '')}<br/>
        Телефон: {contract_data.get('company_phone', '')}<br/>
        Email: {contract_data.get('company_email', '')}
        """
        story.append(Paragraph(executor_text, self.styles['RussianNormal']))
        story.append(Spacer(1, 12))
        
        # Заказчик
        client_text = f"""
        <b>ЗАКАЗЧИК:</b> {contract_data.get('client_name', '')}<br/>
        Телефон: {contract_data.get('client_phone', '')}<br/>
        Email: {contract_data.get('client_email', '')}
        """
        story.append(Paragraph(client_text, self.styles['RussianNormal']))
        story.append(Spacer(1, 20))
        
        # Предмет договора
        story.append(Paragraph("1. ПРЕДМЕТ ДОГОВОРА", self.styles['RussianHeading']))
        subject_text = f"""
        Исполнитель обязуется оказать Заказчику услуги согласно настоящему договору, 
        а Заказчик обязуется принять и оплатить оказанные услуги.
        """
        story.append(Paragraph(subject_text, self.styles['RussianNormal']))
        story.append(Spacer(1, 12))
        
        # Услуги (если есть)
        if contract_data.get('services'):
            story.append(Paragraph("Перечень услуг:", self.styles['RussianNormal']))
            services_data = [['№', 'Наименование услуги', 'Стоимость']]
            for idx, service in enumerate(contract_data['services'], 1):
                services_data.append([
                    str(idx),
                    service.get('name', ''),
                    f"{service.get('price', 0)} руб."
                ])
            
            services_table = Table(services_data, colWidths=[30, 300, 100])
            services_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'DejaVuSans-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(services_table)
            story.append(Spacer(1, 20))
        
        # Стоимость
        story.append(Paragraph("2. СТОИМОСТЬ УСЛУГ", self.styles['RussianHeading']))
        amount_text = f"""
        Общая стоимость услуг по настоящему договору составляет: 
        <b>{contract_data.get('amount', 0)} руб.</b>
        """
        story.append(Paragraph(amount_text, self.styles['RussianNormal']))
        story.append(Spacer(1, 20))
        
        # Срок действия
        story.append(Paragraph("3. СРОК ДЕЙСТВИЯ ДОГОВОРА", self.styles['RussianHeading']))
        period_text = f"""
        Договор вступает в силу с {contract_data.get('start_date', '')} 
        и действует до {contract_data.get('end_date', '')}.
        """
        story.append(Paragraph(period_text, self.styles['RussianNormal']))
        story.append(Spacer(1, 20))
        
        # Подписи
        story.append(Spacer(1, 40))
        signatures_data = [
            ['ИСПОЛНИТЕЛЬ:', 'ЗАКАЗЧИК:'],
            ['', ''],
            ['_________________', '_________________'],
            [contract_data.get('company_director', ''), contract_data.get('client_name', '')]
        ]
        
        signatures_table = Table(signatures_data, colWidths=[250, 250])
        signatures_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, 0), 'DejaVuSans-Bold'),
        ]))
        story.append(signatures_table)
        
        # Генерируем PDF
        doc.build(story)
        return output_path
    
    def generate_invoice_pdf(self, invoice_data: Dict[str, Any], output_path: str) -> str:
        """
        Генерировать PDF счета
        
        Args:
            invoice_data: Данные счета
            output_path: Путь для сохранения PDF
            
        Returns:
            Путь к созданному файлу
        """
        doc = SimpleDocTemplate(output_path, pagesize=A4)
        story = []
        
        # Заголовок
        title = Paragraph(f"СЧЕТ НА ОПЛАТУ № {invoice_data.get('invoice_number', 'N/A')}", self.styles['RussianTitle'])
        story.append(title)
        story.append(Spacer(1, 12))
        
        # Дата
        date_text = f"от {invoice_data.get('issue_date', datetime.now().strftime('%d.%m.%Y'))}"
        story.append(Paragraph(date_text, self.styles['RussianNormal']))
        story.append(Spacer(1, 20))
        
        # Поставщик
        story.append(Paragraph("Поставщик:", self.styles['RussianHeading']))
        supplier_text = f"""
        {invoice_data.get('company_name', 'ООО "Компания"')}<br/>
        ИНН: {invoice_data.get('company_inn', '')}<br/>
        Адрес: {invoice_data.get('company_address', '')}<br/>
        Телефон: {invoice_data.get('company_phone', '')}<br/>
        Email: {invoice_data.get('company_email', '')}
        """
        story.append(Paragraph(supplier_text, self.styles['RussianNormal']))
        story.append(Spacer(1, 12))
        
        # Покупатель
        story.append(Paragraph("Покупатель:", self.styles['RussianHeading']))
        buyer_text = f"""
        {invoice_data.get('client_name', '')}<br/>
        Телефон: {invoice_data.get('client_phone', '')}<br/>
        Email: {invoice_data.get('client_email', '')}
        """
        story.append(Paragraph(buyer_text, self.styles['RussianNormal']))
        story.append(Spacer(1, 20))
        
        # Таблица товаров/услуг
        items_data = [['№', 'Наименование', 'Кол-во', 'Цена', 'Сумма']]
        
        total = 0
        for idx, item in enumerate(invoice_data.get('items', []), 1):
            quantity = item.get('quantity', 1)
            price = item.get('price', 0)
            amount = quantity * price
            total += amount
            
            items_data.append([
                str(idx),
                item.get('description', ''),
                str(quantity),
                f"{price:.2f}",
                f"{amount:.2f}"
            ])
        
        # Итого
        items_data.append(['', '', '', 'ИТОГО:', f"{total:.2f}"])
        
        items_table = Table(items_data, colWidths=[30, 250, 60, 80, 80])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'DejaVuSans-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -2), colors.beige),
            ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
            ('FONTNAME', (0, -1), (-1, -1), 'DejaVuSans-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(items_table)
        story.append(Spacer(1, 20))
        
        # Сумма прописью (упрощенно)
        story.append(Paragraph(f"Всего к оплате: <b>{total:.2f} руб.</b>", self.styles['RussianNormal']))
        story.append(Spacer(1, 40))
        
        # Подпись
        story.append(Paragraph("Директор: _________________", self.styles['RussianNormal']))
        
        # Генерируем PDF
        doc.build(story)
        return output_path


def generate_contract_pdf(contract_data: Dict[str, Any], output_dir: str = "/tmp") -> str:
    """
    Генерировать PDF договора
    
    Args:
        contract_data: Данные договора
        output_dir: Директория для сохранения
        
    Returns:
        Путь к созданному файлу
    """
    generator = PDFGenerator()
    filename = f"contract_{contract_data.get('id', 'new')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    output_path = os.path.join(output_dir, filename)
    
    return generator.generate_contract_pdf(contract_data, output_path)


def generate_invoice_pdf(invoice_data: Dict[str, Any], output_dir: str = "/tmp") -> str:
    """
    Генерировать PDF счета
    
    Args:
        invoice_data: Данные счета
        output_dir: Директория для сохранения
        
    Returns:
        Путь к созданному файлу
    """
    generator = PDFGenerator()
    filename = f"invoice_{invoice_data.get('id', 'new')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    output_path = os.path.join(output_dir, filename)
    
    return generator.generate_invoice_pdf(invoice_data, output_path)
