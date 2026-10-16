ДокРевью: экспериментальная замена dictionary-ru на ru-spelling-dictionary 1.0.9.

Скопируйте содержимое архива в корень проекта с сохранением путей.
Новый словарь встроен через Vite ?raw, поэтому нужен запуск сборки electron-vite.
Изменения: словарь Hunspell в UTF-8; дефисные конструкции; без случайных подсказок; тесты.

ВНИМАНИЕ: тесты и сборка в текущем Linux-окружении НЕ ПРОШЛИ запуск:
в исходном node_modules отсутствует Linux-пакет @rollup/rollup-linux-x64-gnu.
На Windows выполните npm install, npm run reviewer:test, npm run reviewer:build.
Зависание на больших проектах этим патчем НЕ устранено.
Исходные проекты документации не изменяются.
Лицензия словаря — LICENSE-ru-spelling-dictionary.txt.
