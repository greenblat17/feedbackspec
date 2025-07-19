"use client";

import { useState, useEffect } from "react";
import { createClient } from "../../libs/supabase/client.js";
import GmailSetup from "../../components/integrations/GmailSetup.js";
import ButtonAccount from "../../components/ButtonAccount.js";

export default function IntegrationsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Вход в систему</h1>
          <p className="mb-4">Для доступа к интеграциям необходимо войти в систему</p>
          <ButtonAccount />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="navbar bg-base-100 border-b">
        <div className="flex-1">
          <h1 className="text-xl font-bold">Интеграции</h1>
        </div>
        <div className="flex-none">
          <ButtonAccount />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Настройка интеграций
            </h2>
            <p className="text-gray-600">
              Подключите внешние сервисы для автоматического сбора обратной связи
            </p>
          </div>

          {/* Integration Cards */}
          <div className="space-y-6">
            {/* Gmail Integration */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b">
                <h3 className="text-xl font-semibold text-gray-900">
                  Email интеграции
                </h3>
                <p className="text-gray-600 mt-1">
                  Подключите почтовые сервисы для сбора обратной связи
                </p>
              </div>
              <div className="p-6">
                <GmailSetup />
              </div>
            </div>

            {/* Future Integrations */}
            <div className="bg-white rounded-lg shadow-md opacity-60">
              <div className="p-6 border-b">
                <h3 className="text-xl font-semibold text-gray-900">
                  Будущие интеграции
                </h3>
                <p className="text-gray-600 mt-1">
                  Скоро будут доступны дополнительные интеграции
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Slack */}
                  <div className="p-4 border border-gray-200 rounded-lg text-center opacity-50">
                    <div className="text-2xl mb-2">💬</div>
                    <h4 className="font-medium text-gray-900">Slack</h4>
                    <p className="text-sm text-gray-500">Скоро</p>
                  </div>

                  {/* Discord */}
                  <div className="p-4 border border-gray-200 rounded-lg text-center opacity-50">
                    <div className="text-2xl mb-2">🎮</div>
                    <h4 className="font-medium text-gray-900">Discord</h4>
                    <p className="text-sm text-gray-500">Скоро</p>
                  </div>

                  {/* Telegram */}
                  <div className="p-4 border border-gray-200 rounded-lg text-center opacity-50">
                    <div className="text-2xl mb-2">✈️</div>
                    <h4 className="font-medium text-gray-900">Telegram</h4>
                    <p className="text-sm text-gray-500">Скоро</p>
                  </div>

                  {/* Jira */}
                  <div className="p-4 border border-gray-200 rounded-lg text-center opacity-50">
                    <div className="text-2xl mb-2">🎯</div>
                    <h4 className="font-medium text-gray-900">Jira</h4>
                    <p className="text-sm text-gray-500">Скоро</p>
                  </div>

                  {/* GitHub */}
                  <div className="p-4 border border-gray-200 rounded-lg text-center opacity-50">
                    <div className="text-2xl mb-2">🐙</div>
                    <h4 className="font-medium text-gray-900">GitHub</h4>
                    <p className="text-sm text-gray-500">Скоро</p>
                  </div>

                  {/* Zendesk */}
                  <div className="p-4 border border-gray-200 rounded-lg text-center opacity-50">
                    <div className="text-2xl mb-2">🎫</div>
                    <h4 className="font-medium text-gray-900">Zendesk</h4>
                    <p className="text-sm text-gray-500">Скоро</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Нужна помощь?
            </h3>
            <p className="text-blue-700 mb-4">
              Если у вас возникли проблемы с настройкой интеграций, ознакомьтесь с документацией или обратитесь в поддержку.
            </p>
            <div className="flex gap-4">
              <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Документация
              </button>
              <button className="px-4 py-2 border border-blue-300 text-blue-700 rounded hover:bg-blue-100">
                Связаться с поддержкой
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}