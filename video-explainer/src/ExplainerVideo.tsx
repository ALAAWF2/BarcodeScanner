import { useCurrentFrame, useVideoConfig, interpolate, spring, interpolateColors } from "remotion";
import React from "react";

export const ExplainerVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Slide durations in frames (90 frames = 3 seconds at 30fps)
  const slideDuration = 90;
  
  // Calculate which slide is active
  const currentSlide = Math.floor(frame / slideDuration);
  const slideFrame = frame % slideDuration;

  // Spring animation for smooth transitions
  const progress = spring({
    frame: slideFrame,
    fps,
    config: {
      damping: 12,
    },
  });

  // Base styling variables for Light Theme explainer video
  const styles = {
    container: {
      flex: 1,
      backgroundColor: "#f1f5f9",
      color: "#0f172a",
      fontFamily: "'Cairo', 'Helvetica', Arial, sans-serif",
      display: "flex",
      flexDirection: "column" as const,
      justifyContent: "center",
      alignItems: "center",
      padding: 60,
      width: "100%",
      height: "100%",
      position: "relative" as const,
      direction: "rtl" as const,
    },
    header: {
      position: "absolute" as const,
      top: 50,
      display: "flex",
      alignItems: "center",
      gap: 15,
    },
    logoIcon: {
      fontSize: 40,
    },
    headerText: {
      fontSize: 28,
      fontWeight: 800,
      color: "#4f46e5",
    },
    slideContainer: {
      display: "flex",
      flexDirection: "row" as const,
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      maxWidth: 1400,
      gap: 80,
    },
    contentArea: {
      flex: 1.2,
      display: "flex",
      flexDirection: "column" as const,
      gap: 20,
      textAlign: "right" as const,
    },
    visualArea: {
      flex: 0.8,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: 54,
      fontWeight: 800,
      color: "#0f172a",
      lineHeight: 1.3,
    },
    description: {
      fontSize: 32,
      color: "#475569",
      lineHeight: 1.6,
      fontWeight: 400,
    },
    stepBadge: {
      backgroundColor: "rgba(79, 70, 229, 0.1)",
      color: "#4f46e5",
      padding: "8px 20px",
      borderRadius: 30,
      fontSize: 22,
      fontWeight: 700,
      alignSelf: "flex-start",
    },
    mockPhone: {
      width: 320,
      height: 560,
      backgroundColor: "#ffffff",
      borderRadius: 40,
      border: "12px solid #0f172a",
      boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
      position: "relative" as const,
    },
    mockPhoneScreen: {
      padding: 20,
      flex: 1,
      display: "flex",
      flexDirection: "column" as const,
      gap: 15,
      backgroundColor: "#f8fafc",
    },
    footerText: {
      position: "absolute" as const,
      bottom: 40,
      fontSize: 20,
      color: "#64748b",
      fontWeight: 600,
    }
  };

  // Render slides based on frame index
  return (
    <div style={styles.container}>
      {/* Import Cairo Google Font inside the composition */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
          body {
            font-family: 'Cairo', sans-serif;
          }
        `}
      </style>

      {/* Top persistent header */}
      <div style={styles.header}>
        <span style={styles.logoIcon}>⚡</span>
        <span style={styles.headerText}>نظام الجرد الذكي بالباركود</span>
      </div>

      {/* Slide 1: Introduction (Frames 0 - 89) */}
      {currentSlide === 0 && (
        <div style={{
          ...styles.slideContainer,
          opacity: interpolate(slideFrame, [0, 10, 80, 89], [0, 1, 1, 0]),
          transform: `scale(${interpolate(slideFrame, [0, 10], [0.95, 1], { extrapolateRight: "clamp" })})`
        }}>
          <div style={{ ...styles.contentArea, flex: 2, textAlign: "center" }}>
            <h1 style={{ ...styles.title, fontSize: 68, marginBottom: 15 }}>
              كيف يعمل نظام الجرد الذكي؟ 📦
            </h1>
            <p style={{ ...styles.description, fontSize: 36, color: "#4f46e5", fontWeight: 700 }}>
              دليلك الكامل لربط جرد مستودعك بجداول جوجل شيت بلحظات!
            </p>
            <p style={{ ...styles.description, fontSize: 26, marginTop: 10 }}>
              شرح مبسط لخطوات العمل الفورية من كاميرا العامل إلى شاشة الإدارة.
            </p>
          </div>
          <div style={{
            ...styles.visualArea,
            fontSize: 180,
            transform: `rotate(${interpolate(slideFrame, [0, 80], [-10, 10])}deg)`
          }}>
            📲
          </div>
        </div>
      )}

      {/* Slide 2: Step 1 - Scan (Frames 90 - 179) */}
      {currentSlide === 1 && (
        <div style={{
          ...styles.slideContainer,
          opacity: interpolate(slideFrame, [0, 10, 80, 89], [0, 1, 1, 0])
        }}>
          <div style={styles.contentArea}>
            <div style={styles.stepBadge}>الخطوة 1</div>
            <h1 style={styles.title}>مسح الباركود بالكاميرا 📷</h1>
            <p style={styles.description}>
              يفتح الموظف التطبيق من جواله ويضغط على "بدء المسح" لتفتح الكاميرا فوراً ويقرأ باركود المنتج.
            </p>
            <p style={{ ...styles.description, fontSize: 22, color: "#64748b" }}>
              * لا يحتاج أجهزة جرد متخصصة ومكلفة، كاميرا الجوال العادية تفي بالغرض تماماً!
            </p>
          </div>
          <div style={styles.visualArea}>
            <div style={styles.mockPhone}>
              <div style={styles.mockPhoneScreen}>
                <div style={{ backgroundColor: "#e2e8f0", height: 35, borderRadius: 8, display: "flex", alignItems: "center", paddingRight: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}> مساعد الجرد</span>
                </div>
                <div style={{
                  flex: 1,
                  backgroundColor: "#020617",
                  borderRadius: 16,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden"
                }}>
                  {/* Laser Line Scan animation */}
                  <div style={{
                    position: "absolute",
                    width: "90%",
                    height: 3,
                    background: "var(--primary)",
                    backgroundColor: "#ef4444",
                    boxShadow: "0 0 10px #ef4444",
                    top: `${interpolate(slideFrame, [0, slideDuration], [10, 90])}%`
                  }}></div>
                  <span style={{ fontSize: 80 }}>🔳</span>
                </div>
                <div style={{
                  backgroundColor: "#4f46e5",
                  color: "#fff",
                  padding: 10,
                  borderRadius: 12,
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: 700
                }}>
                  جاري قراءة الباركود...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide 3: Step 2 - Edit Qty (Frames 180 - 269) */}
      {currentSlide === 2 && (
        <div style={{
          ...styles.slideContainer,
          opacity: interpolate(slideFrame, [0, 10, 80, 89], [0, 1, 1, 0])
        }}>
          <div style={styles.contentArea}>
            <div style={styles.stepBadge}>الخطوة 2</div>
            <h1 style={styles.title}>عرض المنتج وإدخال الجرد 📝</h1>
            <p style={styles.description}>
              يبحث النظام عن الباركود فوراً ويعرض اسمه للموظف:
              <strong style={{ color: "#4f46e5", display: "block", marginTop: 10 }}>"بيبسي علبة 320 مل - الكمية الحالية: 120"</strong>
            </p>
            <p style={styles.description}>
              يقوم الموظف بعدّ المنتج وإدخال الكمية الفعلية بسهولة من خلال أزرار الجمع والطرح (+ / -).
            </p>
          </div>
          <div style={styles.visualArea}>
            <div style={styles.mockPhone}>
              <div style={styles.mockPhoneScreen}>
                <div style={{ backgroundColor: "#e2e8f0", height: 35, borderRadius: 8, display: "flex", alignItems: "center", paddingRight: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>تفاصيل المنتج</span>
                </div>
                <div style={{ padding: 15, backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>بيبسي علبة 320 مل</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>باركود: 012000046450</div>
                  <div style={{ backgroundColor: "#f8fafc", padding: 10, borderRadius: 8, fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                    <span>الكمية في الشيت:</span>
                    <strong>120</strong>
                  </div>
                  
                  {/* Plus/minus animation representation */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 15, marginTop: 10 }}>
                    <button style={{ width: 35, height: 35, borderRadius: "50%", border: "1px solid #cbd5e1", backgroundColor: "#fff", fontSize: 20 }}>-</button>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#4f46e5" }}>
                      {interpolate(slideFrame, [0, 40, 80], [120, 123, 125], { extrapolateRight: "clamp" })}
                    </span>
                    <button style={{ width: 35, height: 35, borderRadius: "50%", border: "1px solid #cbd5e1", backgroundColor: "#4f46e5", color: "#fff", fontSize: 20 }}>+</button>
                  </div>
                </div>
                <div style={{
                  backgroundColor: "#10b981",
                  color: "#fff",
                  padding: 10,
                  borderRadius: 12,
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  marginTop: "auto"
                }}>
                  تأكيد وتحديث الشيت ✓
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide 4: Step 3 - Sync (Frames 270 - 359) */}
      {currentSlide === 3 && (
        <div style={{
          ...styles.slideContainer,
          opacity: interpolate(slideFrame, [0, 10, 80, 89], [0, 1, 1, 0])
        }}>
          <div style={styles.contentArea}>
            <div style={styles.stepBadge}>الخطوة 3</div>
            <h1 style={styles.title}>المزامنة اللحظية مع جوجل شيت ⚡</h1>
            <p style={styles.description}>
              بمجرد الضغط على زر التأكيد، يرسل النظام طلباً مشفراً إلى جوجل شيت ليقوم بتعديل البيانات فوراً دون أي تدخل يدوي!
            </p>
            <p style={{ ...styles.description, fontSize: 24, color: "#10b981", fontWeight: 700 }}>
              تم التحديث التلقائي في ثوانٍ معدودة.
            </p>
          </div>
          <div style={{ ...styles.visualArea, flexDirection: "column", gap: 20 }}>
            {/* Google Sheets mock display */}
            <div style={{
              width: 500,
              backgroundColor: "#ffffff",
              borderRadius: 16,
              border: "1px solid #cbd5e1",
              boxShadow: "0 10px 20px rgba(0,0,0,0.05)",
              overflow: "hidden"
            }}>
              <div style={{ backgroundColor: "#10b981", color: "#fff", padding: "10px 15px", fontSize: 14, fontWeight: 700, display: "flex", gap: 10 }}>
                <span>🟢</span>
                <span>جدول جرد المستودع الحقيقي (Google Sheet)</span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "right" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                    <th style={{ padding: 10 }}>الباركود</th>
                    <th style={{ padding: 10 }}>اسم المنتج</th>
                    <th style={{ padding: 10 }}>الكمية الدفترية</th>
                    <th style={{ padding: 10 }}>الكمية الفعلية</th>
                    <th style={{ padding: 10 }}>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: 10, fontFamily: "monospace" }}>6281000000123</td>
                    <td style={{ padding: 10, fontWeight: 700 }}>عصير برتقال 1 لتر</td>
                    <td style={{ padding: 10 }}>45</td>
                    <td style={{ padding: 10 }}>-</td>
                    <td style={{ padding: 10 }}><span style={{ color: "#d97706" }}>معلق</span></td>
                  </tr>
                  {/* The Row that animates live */}
                  <tr style={{
                    backgroundColor: interpolateColors(slideFrame, [0, 30, 80], ["#ffffff", "rgba(16, 185, 129, 0.1)", "#ffffff"]),
                    borderBottom: "1px solid #e2e8f0"
                  }}>
                    <td style={{ padding: 10, fontFamily: "monospace" }}>012000046450</td>
                    <td style={{ padding: 10, fontWeight: 700 }}>بيبسي علبة 320 مل</td>
                    <td style={{ padding: 10 }}>120</td>
                    <td style={{ padding: 10, fontWeight: 700, color: "#059669" }}>
                      {slideFrame > 30 ? "125" : "-"}
                    </td>
                    <td style={{ padding: 10 }}>
                      <span style={{
                        color: slideFrame > 30 ? "#059669" : "#d97706",
                        fontWeight: 700
                      }}>
                        {slideFrame > 30 ? "تم الجرد ✓" : "معلق"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Slide 5: Outro (Frames 360 - 449) */}
      {currentSlide === 4 && (
        <div style={{
          ...styles.slideContainer,
          opacity: interpolate(slideFrame, [0, 10, 80, 89], [0, 1, 1, 0]),
          justifyContent: "center",
          textAlign: "center"
        }}>
          <div style={{ ...styles.contentArea, flex: 1, alignItems: "center" }}>
            <span style={{ fontSize: 90, marginBottom: 20 }}>🚀</span>
            <h1 style={{ ...styles.title, fontSize: 60 }}>
              وفّر الوقت، الجهد والتكاليف اليوم!
            </h1>
            <p style={{ ...styles.description, fontSize: 32, color: "#4f46e5", fontWeight: 700, marginTop: 10 }}>
              نظام جرد حديث متكامل جاهز للتثبيت والتشغيل فوراً.
            </p>
            <div style={{
              display: "flex",
              gap: 20,
              marginTop: 30
            }}>
              <div style={{ backgroundColor: "#fff", border: "1px solid #cbd5e1", padding: "15px 30px", borderRadius: 16, fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
                <span>📱</span> تطبيق ويب متجاوب للجوالات
              </div>
              <div style={{ backgroundColor: "#fff", border: "1px solid #cbd5e1", padding: "15px 30px", borderRadius: 16, fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
                <span>🟢</span> تكامل فوري مع Google Sheets
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Persistent footer tagline */}
      <div style={styles.footerText}>
        تصميم عصري متطور وثيم فاتح مريح للعين 👁️
      </div>
    </div>
  );
};
