# WAVEROCK 세팅 달력

누구나 같은 세 지점 달력을 조회·편집하는 정적 웹 앱입니다. 로그인 없이 일정 추가·수정·삭제가 가능합니다.

## 공용 저장 연결

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/schema.sql` 전체를 한 번 실행합니다.
3. 프로젝트의 URL과 Publishable key를 `config.mjs`에 입력합니다. 공개용 키만 사용하며 Secret 또는 service_role 키를 넣지 않습니다.
4. `npm start` 후 http://127.0.0.1:4173 에 접속합니다. 별도 npm 의존성 설치 없이 Node.js와 Python 3를 사용합니다.

서버 설정 전에는 일정 편집을 막습니다. 연결 후에는 일정별로 서버에 저장하고 10초마다 또는 창에 다시 돌아올 때 갱신합니다. 편집 팝업을 연 동안에는 자동 갱신을 보류합니다. 같은 일정에 대한 동시 변경은 버전으로 충돌을 확인합니다. 저장 실패 시 입력 내용을 유지하며 성공으로 표시하지 않습니다. 연결이 끊긴 상태에서는 서버 저장이 불가능합니다.

기존 로컬 버전의 일정은 브라우저의 `waverock.calendar.v1`에 그대로 남아 있고, 공개 서버로 자동 전송하지 않습니다. 선택한 연월·지점만 기기별로 저장합니다. 현재 구현은 하나의 공용 달력을 사용합니다.

## GitHub 및 웹 배포

프로젝트를 GitHub 저장소에 업로드한 후 GitHub Pages 등 정적 호스팅에서 루트의 `index.html`을 제공합니다. GitHub Pages의 브랜치 배포를 사용한다면 저장소 Settings → Pages에서 main 브랜치의 /(root)를 선택합니다. Supabase 설정을 먼저 완료하세요. GitHub 저장소: https://github.com/igoodimin/waverock-Routesetting-calendar

운영 주소: https://igoodimin.github.io/waverock-Routesetting-calendar/

배포에 필요한 파일은 `index.html`, `style.css`, `app.mjs`, `calendar.mjs`, `shared-store.mjs`, `config.mjs`, `assets/background.png`, `assets/mark-*-small.svg`, `assets/mark-*-large.svg`입니다. 폰트 사본은 제거했고 `.gitignore`에서도 제외합니다.

## 폰트

Pretendard는 공식 안내의 cdnjs 1.3.9 웹폰트 CSS를 사용합니다. SIL OFL로 상업적 사용·재배포가 허용됩니다: https://github.com/orioncactus/pretendard

날짜는 기기에 설치된 Arial Black을 우선 사용하고, 없으면 Pretendard Black(900)으로 표시합니다. Arial Black 파일을 제공하지 않습니다. 대체 폰트는 날짜 모양과 폭이 다를 수 있습니다. CDN 연결이 필요합니다.

## 출력 및 사용자 검증

PNG는 2160×2700px, 150dpi로 추출합니다. 날짜를 클릭·드래그하여 일정을 만들고 카드를 눌러 수정합니다. 5주 고정 및 월 경계 처리 규칙은 기존 구현을 유지합니다.

이번 변경의 테스트·브라우저·PNG·서버 검증은 사용자 담당이며 에이전트는 실행하지 않았습니다.

- 폰트가 없는 기기에서도 글자와 날짜가 표시되는지 확인합니다.
- PNG를 내려받아 글꼴·배치·해상도를 확인합니다.
- 일정 추가 후 새로고침 및 다른 브라우저에서 저장 내용을 확인합니다.
- 두 브라우저로 서로 다른 일정 저장과 같은 일정 동시 수정을 확인합니다.
- 네트워크가 끊기면 오류가 표시되고 팝업 입력이 유지되는지 확인합니다.

모든 방문자가 모든 일정을 삭제할 수도 있는 공개 편집 정책입니다. 별도의 사용자별 공간·로그인·변경 이력·복구 기능은 없습니다.
