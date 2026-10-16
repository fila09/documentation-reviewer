/** Read-only reference data for the glossary UI. These entries are NOT yet active checker rules. */
export type TermKind = 'Допустимый' | 'Рекомендуемый';
export interface TermEntry {
  term: string;
  kind: TermKind;
  category: string;
  definition: string;
  preferred: string;
  variants?: string;
  note?: string;
}
export const terminology: readonly TermEntry[] = [
  {term: 'Керберизация', kind: 'Допустимый', category: 'Безопасность', definition: 'Использование Kerberos для аутентификации в системе.', preferred: 'керберизация, керберизации', variants: 'кеберизация, кеберизации', note: 'Нежелательные варианты — опечатки.'},
  {term: 'URL-адрес', kind: 'Рекомендуемый', category: 'Стиль', definition: 'Адрес ресурса в сети. В документации обычно предпочтительнее разговорного «урл».', preferred: 'URL-адрес, URL-адресами', variants: 'урл, урлы, урлами', note: 'Выбор между URL-адресом и ссылкой зависит от контекста.'},
  {term: 'Оркестратор', kind: 'Допустимый', category: 'Инфраструктура', definition: 'Компонент, управляющий выполнением и координацией процессов.', preferred: 'оркестратор'},
  {term: 'Репозиторий', kind: 'Допустимый', category: 'Разработка', definition: 'Хранилище файлов, пакетов или версий исходного кода.', preferred: 'репозиторий'},
  {term: 'Фреймворк', kind: 'Допустимый', category: 'Разработка', definition: 'Набор инструментов и соглашений для создания программного обеспечения.', preferred: 'фреймворк'},
  {term: 'Хост', kind: 'Допустимый', category: 'Инфраструктура', definition: 'Устройство или система, подключённая к сети и предоставляющая либо использующая ресурсы.', preferred: 'хост'},
  {term: 'Шардирование', kind: 'Допустимый', category: 'Базы данных', definition: 'Разделение данных на части (шарды) для распределённого хранения и обработки.', preferred: 'шардирование'},
  {term: 'RT.Warehouse', kind: 'Рекомендуемый', category: 'Продукты', definition: 'Утверждённое написание названия продукта.', preferred: 'RT.Warehouse', variants: 'RT.WareHouse', note: 'Устаревшее написание следует заменять в обычном тексте; пути и идентификаторы проверяются отдельно.'},
];

export const reviewRules = [
  {title: 'Структура', description: 'Проверка структуры Markdown-документов и проекта.'},
  {title: 'Markdown', description: 'Проверка разметки и связанных элементов документа.'},
  {title: 'Ссылки', description: 'Проверка ссылок и доступности локальных ресурсов.'},
  {title: 'Орфография', description: 'Поиск слов, отсутствующих в подключённом русском словаре. Не каждое предупреждение означает ошибку.'},
  {title: 'Терминология', description: 'Контроль утверждённых и нежелательных вариантов терминов — планируемое расширение.'},
  {title: 'Стиль', description: 'Рекомендации по разговорным словам и англицизмам — планируемое расширение.'},
] as const;
