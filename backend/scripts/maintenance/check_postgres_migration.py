#!/usr/bin/env python3
"""
Проверка кода на проблемы при миграции с SQLite на PostgreSQL
"""
import re
import os
from pathlib import Path
from typing import List, Dict, Tuple

# Цвета для вывода
RED = '\033[91m'
YELLOW = '\033[93m'
GREEN = '\033[92m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'

class MigrationChecker:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        self.issues: List[Dict] = []
        
        # Паттерны для поиска
        self.patterns = {
            'placeholder_question_mark': {
                'regex': re.compile(r'c\.execute\([^)]*\?', re.IGNORECASE),
                'severity': 'CRITICAL',
                'description': 'Использование ? вместо %s (SQLite placeholder)',
                'fix': 'Заменить ? на %s для PostgreSQL'
            },
            'insert_or_replace': {
                'regex': re.compile(r'INSERT\s+OR\s+REPLACE', re.IGNORECASE),
                'severity': 'CRITICAL',
                'description': 'INSERT OR REPLACE не поддерживается в PostgreSQL',
                'fix': 'Использовать ON CONFLICT DO UPDATE'
            },
            'insert_or_ignore': {
                'regex': re.compile(r'INSERT\s+OR\s+IGNORE', re.IGNORECASE),
                'severity': 'CRITICAL',
                'description': 'INSERT OR IGNORE не поддерживается в PostgreSQL',
                'fix': 'Использовать ON CONFLICT DO NOTHING'
            },
            'datetime_now': {
                'regex': re.compile(r"datetime\s*\(\s*['\"]now['\"]", re.IGNORECASE),
                'severity': 'CRITICAL',
                'description': "datetime('now') - SQLite функция",
                'fix': 'Использовать NOW() или CURRENT_TIMESTAMP'
            },
            'datetime_now_interval': {
                'regex': re.compile(r"datetime\s*\(\s*['\"]now['\"].*?['\"][,)]", re.IGNORECASE),
                'severity': 'CRITICAL',
                'description': "datetime('now', '-N seconds/days') - SQLite синтаксис",
                'fix': "Использовать NOW() - INTERVAL 'N seconds'"
            },
            'julianday': {
                'regex': re.compile(r'julianday\s*\(', re.IGNORECASE),
                'severity': 'CRITICAL',
                'description': 'julianday() - SQLite функция для работы с датами',
                'fix': 'Использовать EXTRACT(EPOCH FROM ...) или DATE()'
            },
            'date_function_sql': {
                'regex': re.compile(r'(?:WHERE|AND|OR)\s+date\s*\(', re.IGNORECASE),
                'severity': 'HIGH',
                'description': 'date() в SQL запросе - может быть SQLite функция',
                'fix': 'Использовать DATE() (заглавными) или ::date'
            },
            'autoincrement': {
                'regex': re.compile(r'AUTOINCREMENT', re.IGNORECASE),
                'severity': 'HIGH',
                'description': 'AUTOINCREMENT - SQLite синтаксис',
                'fix': 'Использовать SERIAL или BIGSERIAL'
            },
        }
    
    def check_file(self, filepath: Path) -> None:
        """Проверить один файл"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            for line_num, line in enumerate(lines, start=1):
                # Пропускаем комментарии
                if line.strip().startswith('#'):
                    continue
                    
                for pattern_name, pattern_info in self.patterns.items():
                    if pattern_info['regex'].search(line):
                        # Дополнительная проверка для date() - исключаем Python datetime
                        if pattern_name == 'date_function_sql':
                            # Пропускаем если это Python код (datetime.now().date(), .strftime и т.д.)
                            if any(x in line for x in ['.date()', 'strftime', 'datetime.', 'import', 'from datetime']):
                                continue
                        
                        # Пропускаем ложные срабатывания для placeholder
                        if pattern_name == 'placeholder_question_mark':
                            # Проверяем что это SQL, а не просто вопросительный знак в строке
                            if 'execute' not in line.lower():
                                continue
                            # Пропускаем если это комментарий или документация
                            if '"""' in line or "'''" in line:
                                continue
                        
                        self.issues.append({
                            'file': str(filepath.relative_to(self.root_dir)),
                            'line': line_num,
                            'severity': pattern_info['severity'],
                            'pattern': pattern_name,
                            'description': pattern_info['description'],
                            'fix': pattern_info['fix'],
                            'code': line.strip()
                        })
        
        except Exception as e:
            print(f"{RED}Ошибка при чтении {filepath}: {e}{RESET}")
    
    def scan_directory(self) -> None:
        """Сканировать все .py файлы в директории"""
        print(f"{BLUE}{BOLD}🔍 Сканирование Python файлов...{RESET}\n")
        
        py_files = list(self.root_dir.rglob('*.py'))
        
        for filepath in py_files:
            # Пропускаем виртуальные окружения и кэш
            if any(part in filepath.parts for part in ['venv', '__pycache__', '.git', 'node_modules']):
                continue
            
            self.check_file(filepath)
        
        print(f"{GREEN}✅ Проверено файлов: {len(py_files)}{RESET}\n")
    
    def print_report(self) -> None:
        """Вывести отчет о найденных проблемах"""
        if not self.issues:
            print(f"{GREEN}{BOLD}✅ Проблем не найдено! Код готов для PostgreSQL.{RESET}")
            return
        
        # Группируем по severity
        critical = [i for i in self.issues if i['severity'] == 'CRITICAL']
        high = [i for i in self.issues if i['severity'] == 'HIGH']
        
        print(f"{RED}{BOLD}{'='*80}{RESET}")
        print(f"{RED}{BOLD}НАЙДЕНО ПРОБЛЕМ: {len(self.issues)}{RESET}")
        print(f"{RED}{BOLD}{'='*80}{RESET}\n")
        
        if critical:
            print(f"{RED}{BOLD}🔴 КРИТИЧНЫЕ ПРОБЛЕМЫ ({len(critical)}):{RESET}")
            print(f"{RED}Эти проблемы сломают работу с PostgreSQL!{RESET}\n")
            self._print_issues(critical)
        
        if high:
            print(f"\n{YELLOW}{BOLD}🟡 ВАЖНЫЕ ПРОБЛЕМЫ ({len(high)}):{RESET}")
            print(f"{YELLOW}Эти проблемы могут вызвать ошибки{RESET}\n")
            self._print_issues(high)
        
        # Статистика по файлам
        print(f"\n{BLUE}{BOLD}📊 СТАТИСТИКА ПО ФАЙЛАМ:{RESET}")
        files_dict = {}
        for issue in self.issues:
            file = issue['file']
            if file not in files_dict:
                files_dict[file] = 0
            files_dict[file] += 1
        
        # Сортируем по количеству проблем
        sorted_files = sorted(files_dict.items(), key=lambda x: x[1], reverse=True)
        for file, count in sorted_files:
            print(f"  {YELLOW}{count:2d}{RESET} проблем(ы) в {BLUE}{file}{RESET}")
    
    def _print_issues(self, issues: List[Dict]) -> None:
        """Вывести список проблем"""
        for i, issue in enumerate(issues, 1):
            severity_color = RED if issue['severity'] == 'CRITICAL' else YELLOW
            
            print(f"{severity_color}{BOLD}[{issue['severity']}]{RESET} "
                  f"{BLUE}{issue['file']}:{issue['line']}{RESET}")
            print(f"  ❌ Проблема: {issue['description']}")
            print(f"  ✅ Решение: {issue['fix']}")
            print(f"  📝 Код: {issue['code'][:100]}{'...' if len(issue['code']) > 100 else ''}")
            print()
    
    def export_to_file(self, output_file: str) -> None:
        """Экспортировать результаты в файл"""
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("# Отчет о проблемах миграции SQLite → PostgreSQL\n\n")
            f.write(f"Всего найдено проблем: {len(self.issues)}\n\n")
            
            for issue in self.issues:
                f.write(f"## [{issue['severity']}] {issue['file']}:{issue['line']}\n")
                f.write(f"- **Проблема**: {issue['description']}\n")
                f.write(f"- **Решение**: {issue['fix']}\n")
                f.write(f"- **Код**: `{issue['code']}`\n\n")
        
        print(f"{GREEN}✅ Отчет сохранен в: {output_file}{RESET}")

def main():
    # Путь к backend директории
    backend_dir = Path(__file__).parent.parent.parent
    
    print(f"{BOLD}{'='*80}{RESET}")
    print(f"{BOLD}🔍 ПРОВЕРКА МИГРАЦИИ SQLite → PostgreSQL{RESET}")
    print(f"{BOLD}{'='*80}{RESET}\n")
    print(f"Директория: {backend_dir}\n")
    
    checker = MigrationChecker(backend_dir)
    checker.scan_directory()
    checker.print_report()
    
    # Сохраняем отчет
    output_file = backend_dir / 'scripts' / 'maintenance' / 'postgres_migration_report.txt'
    checker.export_to_file(str(output_file))

if __name__ == '__main__':
    main()
