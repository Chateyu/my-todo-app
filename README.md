# My To-Do App

HTML, CSS, JavaScript만으로 만든 할 일 관리 웹 앱입니다. 별도의 빌드나 서버 없이
브라우저에서 바로 실행되며, 모든 데이터는 브라우저의 `localStorage`에 저장됩니다.

## 주요 기능

- **할 일 추가**: 마감일, 우선순위(Low · Medium · High), 카테고리(Personal · Work ·
  Study · Shopping)를 함께 지정
- **완료 체크**: 완료한 항목은 자동으로 목록 아래로 이동
- **수정**: 항목 텍스트를 더블클릭해서 바로 수정 (`Enter` 저장, `Esc` 취소)
- **우선순위 변경**: 항목의 `!` 표시를 클릭하면 우선순위가 순환
- **순서 변경**: `⋮⋮` 손잡이를 드래그해서 순서 바꾸기
- **필터**: 상태(All · Active · Completed)와 카테고리로 목록 걸러 보기
- **마감일 표시**: `Today`, `Tomorrow`, 지난 항목은 `Overdue`로 강조
- **완료 항목 일괄 삭제**: `Clear completed` 버튼
- **다크 모드**: 시스템 설정을 따르고, 버튼으로 직접 전환 가능 (선택값 저장)

## 실행 방법

1.  저장소를 클론합니다.

    ```bash
    git clone https://github.com/Chateyu/my-todo-app.git
    ```

1.  `index.html` 파일을 브라우저로 엽니다.

설치할 패키지는 없습니다.

## 파일 구성

- `index.html`: 페이지 구조와 테마 초기화 스크립트
- `style.css`: 라이트/다크 테마를 포함한 스타일
- `script.js`: 할 일 추가·수정·삭제, 필터, 드래그 정렬, 저장 로직

## 데이터 저장

할 일 목록은 `todo-items`, 테마 설정은 `todo-theme` 키로 브라우저의 `localStorage`에
저장됩니다. 같은 브라우저에서는 새로고침해도 유지되지만, 다른 브라우저나 기기와는
동기화되지 않습니다.
