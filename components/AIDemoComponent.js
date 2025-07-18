import { useState } from "react";
import toast from "react-hot-toast";

export default function AIDemoComponent() {
  const [demoFeedback, setDemoFeedback] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);

  const sampleFeedback = [
    "Приложение очень медленно загружается. Иногда до 30 секунд ждешь.",
    "Обожаю новую темную тему! Глаза не устают работать ночью.",
    "Приложение крашится на iPhone 12 при входе в аккаунт.",
    "Было бы здорово добавить уведомления о новых отзывах.",
    "Интерфейс запутанный, не понимаю как экспортировать данные.",
    "Очень плохая производительность в часы пик. Сайт недоступен.",
    "Поиск работает только по точному совпадению, очень неудобно.",
    "Нужна мобильная версия приложения, веб-версия неудобная.",
  ];

  const testAIAnalysis = async () => {
    if (!demoFeedback.trim()) {
      toast.error("Введите текст отзыва для анализа");
      return;
    }

    setAnalyzing(true);
    setResults(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Demo Feedback",
          content: demoFeedback,
          source: "manual",
          priority: "medium",
          category: "general",
          tags: ["demo", "ai-test"],
        }),
      });

      const result = await response.json();

      if (result.success) {
        setResults(result.data);
        toast.success("AI анализ завершен!");
      } else {
        toast.error("Ошибка при анализе: " + result.message);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Ошибка сети при анализе");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl max-w-4xl mx-auto">
      <div className="card-body">
        <h2 className="card-title text-2xl mb-4">
          🤖 AI Feedback Analysis Demo
        </h2>

        <div className="space-y-4">
          {/* Sample feedback buttons */}
          <div>
            <p className="font-medium mb-2">Попробуйте примеры отзывов:</p>
            <div className="flex flex-wrap gap-2">
              {sampleFeedback.map((sample, index) => (
                <button
                  key={index}
                  className="btn btn-sm btn-outline"
                  onClick={() => setDemoFeedback(sample)}
                >
                  Пример {index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Input area */}
          <div>
            <label className="label">
              <span className="label-text font-medium">Текст отзыва:</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full h-24"
              placeholder="Введите отзыв для AI анализа..."
              value={demoFeedback}
              onChange={(e) => setDemoFeedback(e.target.value)}
            />
          </div>

          {/* Analyze button */}
          <button
            className={`btn btn-primary w-full ${analyzing ? "loading" : ""}`}
            onClick={testAIAnalysis}
            disabled={analyzing || !demoFeedback.trim()}
          >
            {analyzing ? "Анализирую..." : "🔍 Проанализировать с AI"}
          </button>

          {/* Results */}
          {results && (
            <div className="bg-base-200 rounded-lg p-4 space-y-4">
              <h3 className="font-bold text-lg">Результаты AI анализа:</h3>

              {results.aiAnalysis ? (
                <div className="space-y-3">
                  {/* Sentiment */}
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Sentiment:</span>
                    <span
                      className={`badge ${
                        results.aiAnalysis.sentiment === "positive"
                          ? "badge-success"
                          : results.aiAnalysis.sentiment === "negative"
                          ? "badge-error"
                          : "badge-info"
                      }`}
                    >
                      {results.aiAnalysis.sentiment === "positive"
                        ? "😊 Позитивный"
                        : results.aiAnalysis.sentiment === "negative"
                        ? "😞 Негативный"
                        : "😐 Нейтральный"}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Оценка:</span>
                    <span className="badge badge-outline">
                      {results.aiAnalysis.sentimentScore?.toFixed(2) || "N/A"}
                    </span>
                  </div>

                  {/* AI Priority */}
                  <div className="flex justify-between items-center">
                    <span className="font-medium">AI Приоритет:</span>
                    <span
                      className={`badge ${
                        results.aiAnalysis.priority === "high"
                          ? "badge-error"
                          : results.aiAnalysis.priority === "medium"
                          ? "badge-warning"
                          : "badge-info"
                      }`}
                    >
                      {results.aiAnalysis.priority}
                    </span>
                  </div>

                  {/* Categories */}
                  {results.aiAnalysis.categories &&
                    results.aiAnalysis.categories.length > 0 && (
                      <div>
                        <span className="font-medium">AI Категории:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {results.aiAnalysis.categories.map((cat, idx) => (
                            <span
                              key={idx}
                              className="badge badge-primary badge-sm"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Themes */}
                  {results.aiAnalysis.themes &&
                    results.aiAnalysis.themes.length > 0 && (
                      <div>
                        <span className="font-medium">Темы:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {results.aiAnalysis.themes.map((theme, idx) => (
                            <span
                              key={idx}
                              className="badge badge-outline badge-sm"
                            >
                              {theme}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Summary */}
                  {results.aiAnalysis.summary && (
                    <div>
                      <span className="font-medium">Краткое описание:</span>
                      <p className="text-sm mt-1 bg-base-100 p-2 rounded">
                        {results.aiAnalysis.summary}
                      </p>
                    </div>
                  )}

                  {/* Actionable Insights */}
                  {results.aiAnalysis.actionableInsights &&
                    results.aiAnalysis.actionableInsights.length > 0 && (
                      <div>
                        <span className="font-medium">Ключевые выводы:</span>
                        <ul className="text-sm mt-1 space-y-1">
                          {results.aiAnalysis.actionableInsights.map(
                            (insight, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-info">•</span>
                                <span>{insight}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                  {/* Suggested Actions */}
                  {results.aiAnalysis.suggestedActions &&
                    results.aiAnalysis.suggestedActions.length > 0 && (
                      <div>
                        <span className="font-medium">
                          Рекомендуемые действия:
                        </span>
                        <ul className="text-sm mt-1 space-y-1">
                          {results.aiAnalysis.suggestedActions.map(
                            (action, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-success">→</span>
                                <span>{action}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <span className="text-warning">AI анализ недоступен</span>
                  <p className="text-sm text-base-content/70 mt-1">
                    Статус: {results.aiAnalysisStatus || "Неизвестно"}
                  </p>
                </div>
              )}

              {/* Duplicate Check */}
              {results.duplicateCheck?.isDuplicate && (
                <div className="alert alert-warning">
                  <div>
                    <h4 className="font-bold">Обнаружен похожий отзыв!</h4>
                    <p className="text-sm">
                      {results.duplicateCheck.explanation}
                    </p>
                    <p className="text-xs">
                      Схожесть:{" "}
                      {(results.duplicateCheck.similarityScore * 100).toFixed(
                        1
                      )}
                      %
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
