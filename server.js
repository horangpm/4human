import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import PQueue from 'p-queue';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const queue = new PQueue({ concurrency: 1, interval: 4000, intervalCap: 1 });

const systemKnowledge = `
[HAM SSAM 심리 분석 시스템 가이드]
- 4대 도형: 원(관계/감정), 삼각형(목표/이성), 사각형(규범/통제), S자(변화/창의성)
- FSM 5공간: 중앙(자아), 좌(과거/내면), 우(미래/타인), 상(이상), 하(현실)
- 타임라인: 좌(과거), 중앙(현재), 우(미래)
`;

const getPrompt = () => `${systemKnowledge}

위 가이드와 업로드된 이미지를 바탕으로 아래 JSON 형식에 맞춰 심리를 매우 상세하고 전문가답게 분석해주세요.

[필수 작성 지침]
1. 환영 인사 생략, 마크다운 없이 순수 JSON 텍스트만 출력.
2. pastText, presentText, futureText는 내담자의 상황을 전문가적 관점에서 아주 상세하게 분석하여 4~5문장 이상으로 길고 풍부하게 작성하세요.
3. strengthText, weaknessText는 도형의 위치, 색상, 특이점을 근거로 들어 구체적이고 깊이 있는 심리 해석을 3~4문장 이상으로 길게 작성하세요.
4. advice, relationStyle, communicationStyle 역시 구체적인 실천 방안과 통찰을 담아 상세히 작성하세요.
5. JSON 안에서 줄바꿈이 필요한 경우 반드시 '\n' 기호를 여러 번 사용하여 문단을 예쁘게 나누어 주세요.

출력 JSON 포맷 주소:
{
  "primaryShape": "ci|tr|sq|sg",
  "shapeOrder": ["ci","tr","sq","sg"],
  "typeName": "심리 유형",
  "pastText": "과거 심리 (4~5문장 이상)",
  "presentText": "현재 심리 (4~5문장 이상)",
  "futureText": "미래 심리 (4~5문장 이상)",
  "strengths": ["강점1", "강점2", "강점3"],
  "strengthText": "강점 상세 해석 (3~4문장 이상)",
  "weaknesses": ["약점1", "약점2", "약점3"],
  "weaknessText": "약점 상세 해석 (3~4문장 이상)",
  "complements": ["보완점1", "보완점2"],
  "advice": "전체 조언 (상세히)",
  "careers": ["진로1", "진로2", "진로3"],
  "stability": 75,
  "leadership": 60,
  "empathy": 85,
  "creativity": 50,
  "relationStyle": "대인관계 스타일",
  "communicationStyle": "의사소통 스타일"
}
`;

app.post('/api/analyze', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '이미지가 업로드되지 않았습니다.' });
  }

  try {
    const rawKey = process.env.GEMINI_API_KEY || '';
    const cleanKey = rawKey.replace(/[^\x20-\x7E]/g, '').trim();
    
    if (!cleanKey) {
      return res.status(400).json({ error: 'Vercel 환경 변수에 GEMINI_API_KEY가 등록되지 않았거나 잘못 복사되었습니다! Vercel 셋팅(Settings -> Environment Variables)에서 다시 한번 정확히 입력해주세요.' });
    }

    const genAI = new GoogleGenerativeAI(cleanKey);

    const resultJson = await queue.add(async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const imagePart = {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype
        }
      };

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: getPrompt() }, imagePart] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      });

      let text = result.response.text();
      text = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      return text;
    });

    try {
      res.json(JSON.parse(resultJson));
    } catch (parseErr) {
      console.error("=== JSON Parsing Error ===");
      console.error(parseErr);
      console.error("=== Raw AI Output ===");
      console.error(resultJson);
      throw new Error("AI가 올바른 JSON 형식을 반환하지 않았습니다. 다시 시도해주세요.");
    }

  } catch (error) {
    console.error('AI 분석 실패:', error);
    let errMsg = 'AI 분석 실패: ' + error.message;
    let statusCode = 500;
    
    if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('Too Many Requests'))) {
      errMsg = '동시 이용자가 많아 AI 분석 대기열이 꽉 찼습니다. 잠시 후 다시 시도해 주세요. (무료 API 할당량 초과)';
      statusCode = 429;
    } else if (error.message && (error.message.includes('503') || error.message.includes('high demand'))) {
      errMsg = '현재 구글 AI 서버에 전 세계 접속자가 폭주하여 일시적인 장애(503)가 발생했습니다. 약 10~30초 뒤에 다시 시도해 주시면 정상 작동합니다!';
      statusCode = 503;
    }
    
    res.status(statusCode).json({ error: errMsg });
  }
});

app.use(express.static('.'));

app.listen(port, () => {
  console.log(`HAM SSAM 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});

export default app;