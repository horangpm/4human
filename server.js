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
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemKnowledge = `
[HAM SSAM 도형심리 분석 시스템 지식]
■ 4가지 도형: 원(포용력/감정형), 삼각형(리더십/성취형), 사각형(규범/논리형), S형(유연성/창의형)
■ FSM 공간: 중앙(현재), 우상단(미래/동기), 우하단(스트레스), 좌상단(보류), 좌하단(콤플렉스)
■ 타임라인: 상단(미래), 중간(현재), 하단(과거)
`;

const getPrompt = () => `${systemKnowledge}

위 지식을 바탕으로 워크지 이미지를 심층 분석해주세요.

[🚨 최고 중요 품질 지침 🚨]
1. 환각(거짓 정보) 절대 금지.
2. 중복 단어 방지. 다채롭고 성숙한 어휘 사용.
3. pastText, presentText, futureText, strengthText, weaknessText, advice 영역은 **각각 핵심만 담아 2~3문장으로 명료하고 임팩트 있게** 작성하세요. (너무 길면 출력이 끊깁니다!)
4. JSON 문자열 내부에 실제 줄바꿈(Enter)을 절대 사용하지 말고, 줄바꿈이 필요하면 '\\n'을 사용하세요.
5. 응답이 중간에 끊기지 않도록 완벽한 JSON 형식으로 마무리하세요.

다음 JSON 형식으로만 응답해주세요:
{
  "primaryShape": "ci|tr|sq|sg",
  "shapeOrder": ["ci","tr","sq","sg"],
  "typeName": "심리 유형명",
  "pastText": "과거 분석 (2~3문장)",
  "presentText": "현재 분석 (2~3문장)",
  "futureText": "미래 분석 (2~3문장)",
  "strengths": ["강점1", "강점2", "강점3"],
  "strengthText": "강점 해설 (2~3문장)",
  "weaknesses": ["약점1", "약점2", "약점3"],
  "weaknessText": "취약성 해설 (2~3문장)",
  "complements": ["보완점1", "보완점2"],
  "advice": "전문가 조언 (2~3문장)",
  "careers": ["직업1", "직업2", "직업3"],
  "stability": 75,
  "leadership": 60,
  "empathy": 85,
  "creativity": 50,
  "relationStyle": "대인관계 스타일",
  "communicationStyle": "의사소통 방식"
}
`;

app.post('/api/analyze', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '이미지 파일이 제공되지 않았습니다.' });
  }

  try {
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
      throw new Error("AI가 너무 긴 응답을 반환하다가 중간에 끊겼습니다. 다시 시도해주세요.");
    }

  } catch (error) {
    console.error('AI 분석 중 오류:', error);
    let errMsg = 'AI 분석 서버 오류: ' + error.message;
    let statusCode = 500;
    
    if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('Too Many Requests'))) {
      errMsg = '현재 이용자가 많아 AI 분석 대기열이 꽉 찼습니다. 잠시 후 다시 시도해 주세요. (무료 API 할당량 초과)';
      statusCode = 429;
    }
    
    res.status(statusCode).json({ error: errMsg });
  }
});

app.use(express.static('.'));

app.listen(port, () => {
  console.log(`HAM SSAM 벡엔드 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});






