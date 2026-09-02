# Documentation Reviewer v0.1.1

## Главное правило безопасности

Проверяемый проект используется только как источник данных. Documentation Reviewer не создает, не изменяет, не переименовывает и не удаляет файлы или каталоги внутри выбранного проекта.

Настройки и правила находятся в самом приложении. Добавлять `reviewer.config.json` или другие служебные файлы в рабочий репозиторий не требуется.

## Установка

```powershell
npm install
```

Если пакет Electron установился без бинарника:

```powershell
node .\node_modules\electron\install.js
```

## Запуск

```powershell
npm run reviewer:dev
```

В v0.1.1 команда сначала собирает актуальную локальную версию приложения, затем запускает Electron. Горячая перезагрузка временно отключена, потому что dev-server `electron-vite` нестабилен в текущей связке версий на Windows.

## Тесты

```powershell
npm run reviewer:test
```

Тест `readOnlyExternalProject.test.ts` сравнивает структуру и SHA-256 файлов внешнего проекта до и после полного ревью. Тест `readOnlySourceGuard.test.ts` запрещает файловые операции записи в Review Engine.

## Production-сборка

```powershell
npm run reviewer:build
```
