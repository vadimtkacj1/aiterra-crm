import { ArrowRightOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";

export function CancellationPolicyPage() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "transparent", color: "#111827" }}>
      <Button
        type="default"
        icon={<ArrowRightOutlined />}
        onClick={() => navigate(-1)}
        style={{
          position: "fixed",
          top: 20,
          right: 24,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: 6,
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
      >
        חזרה
      </Button>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px 56px", display: "grid", gap: 32 }}>
        <header style={{ display: "grid", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700 }}>מדיניות ביטולים והחזרים כספיים</h1>
          <p style={{ margin: 0, lineHeight: 1.7, color: "#374151" }}>
            מסמך זה מהווה חלק בלתי נפרד מתקנון השימוש במערכת. החברה פועלת בהתאם להוראות חוק הגנת הצרכן, התשמ"א-1981
            והתקנות שהותקנו מכוחו, תוך התאמה לאופי השירותים הדיגיטליים הניתנים בפאנל.
          </p>
        </header>

        <section style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>1. כללי ביטול עסקה לרכישת שירותים</h2>
          <p style={{ margin: 0, lineHeight: 1.8, color: "#374151" }}>
            <strong>שירותי ריטיינר חודשי:</strong> שירותי ניהול קמפיינים, ייעוץ ותמיכה שוטפת נחשבים כ"שירות" על פי חוק.
            ביטול עסקה ייעשה באמצעות מתן הודעה בכתב (באימייל או דרך מערכת הפאנל) לחברה.
          </p>
          <p style={{ margin: 0, lineHeight: 1.8, color: "#374151" }}>
            <strong>מועד הודעת הביטול:</strong> הודעת הביטול תיכנס לתוקף בסיום תקופת החיוב הנוכחית. לא יינתן החזר כספי
            יחסי בגין חלק מחודש שבו השירות כבר היה פעיל, אלא אם הוסכם אחרת בכתב בין הצדדים.
          </p>
        </section>

        <section style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>2. החרגת זכות הביטול (מידע ושירותי ייעוץ)</h2>
          <p style={{ margin: 0, lineHeight: 1.8, color: "#374151" }}>
            בהתאם לתקנות הגנת הצרכן, הלקוח מצהיר כי ידוע לו שזכות הביטול לא תחול במקרים הבאים:
          </p>
          <ul style={{ margin: 0, paddingRight: 20, display: "grid", gap: 8, color: "#374151", lineHeight: 1.8 }}>
            <li>
              <strong>מוצרים שיוצרו במיוחד עבור הצרכן:</strong> קמפיינים שכבר הוקמו, דפי נחיתה שנבנו, או אסטרטגיות
              שיווק שנבנו עבור הלקוח באופן אישי.
            </li>
            <li>
              <strong>מידע כהגדרתו בחוק המחשבים:</strong> מאחר והפאנל מעניק גישה לנתונים, ניתוחים ומידע עסקי, הגישה
              למידע מהווה "תחילת ביצוע השירות" ולא ניתן לבטלה רטרואקטיבית מרגע שנחשף המידע ללקוח.
            </li>
          </ul>
        </section>

        <section style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>3. דמי ביטול</h2>
          <p style={{ margin: 0, lineHeight: 1.8, color: "#374151" }}>
            במידה ובוצעה רכישה של שירות שטרם החלה העבודה עליו (בתוך 14 יום ממועד הרכישה), החברה תהיה רשאית לגבות דמי
            ביטול בשיעור של 5% מסכום העסקה או 100 ש"ח (לפי הנמוך מביניהם), כקבוע בחוק.
          </p>
          <p style={{ margin: 0, lineHeight: 1.8, color: "#374151" }}>
            בנוסף לדמי הביטול, הלקוח יישא בעמלות הסליקה שנגבו על ידי חברת Z-CREDIT ובגין כל הוצאה ישירה שנגרמה לחברה
            כתוצאה מהרכישה (כגון רכישת דומיינים או שטחי פרסום עבורו).
          </p>
        </section>

        <section style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>4. מדיניות "מנוי חודשי מתחדש" (Recurring Payments)</h2>
          <p style={{ margin: 0, lineHeight: 1.8, color: "#374151" }}>
            לקוח שרכש שירות במודל של חיוב חודשי אוטומטי, רשאי להודיע על הפסקת ההתקשרות בכל עת.
          </p>
          <p style={{ margin: 0, lineHeight: 1.8, color: "#374151" }}>
            הפסקת החיוב תבוצע החל ממחזור החיוב הבא, וזאת בתנאי שהודעת הביטול התקבלה לפחות 3 ימי עסקים לפני מועד
            החיוב הקרוב. הודעה שתתקבל לאחר מכן, תגרור חיוב עבור החודש העוקב, והשירות ייעצר בסיומו.
          </p>
        </section>

        <section style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>5. ביטול על ידי החברה</h2>
          <p style={{ margin: 0, lineHeight: 1.8, color: "#374151" }}>
            החברה שומרת לעצמה את הזכות לבטל עסקה או להפסיק מתן שירות ללקוח בכל עת, עקב אחד מהמקרים הבאים:
          </p>
          <ul style={{ margin: 0, paddingRight: 20, display: "grid", gap: 8, color: "#374151", lineHeight: 1.8 }}>
            <li>אי-עמידה בתשלומים.</li>
            <li>הפרה של תקנון השימוש בפאנל.</li>
            <li>
              במקרה שבו נפלה טעות חריגה בתיאור השירות או במחירו כפי שהוצגו בפאנל. במקרה כזה, הלקוח יהיה זכאי להחזר
              כספי בגין החלק היחסי של השירות שטרם ניתן לו, ככל שקיים כזה.
            </li>
          </ul>
        </section>

        <section style={{ display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>6. אופן מתן הודעת ביטול</h2>
          <p style={{ margin: 0, lineHeight: 1.8, color: "#374151" }}>
            לקוח יקר, הנך רשאי לבטל את העסקה בהתאם להוראות חוק הגנת הצרכן, תשמ"א-1981, תקנותיו ומדיניות הביטולים של החברה. ניתן למסור הודעת ביטול עסקה לחברה באמצעות אחת מהדרכים הבאות:
          </p>
          <ul style={{ margin: 0, paddingRight: 20, display: "grid", gap: 8, color: "#374151", lineHeight: 1.8 }}>
            <li>א. בדוא"ל לכתובת office@aiterra.co.il</li>
            <li>ב. בהודעה מסודרת במסרון ישירות לנציג החברה</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
