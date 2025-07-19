const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

/**
 * Gmail Service with OAuth authentication and email operations
 * Основные методы для работы с Gmail API и OAuth авторизацией
 */
class GmailService {
  constructor(accessToken, refreshToken) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Если токены переданы, установить их через setCredentials
    if (accessToken || refreshToken) {
      const tokens = {};
      if (accessToken) tokens.access_token = accessToken;
      if (refreshToken) tokens.refresh_token = refreshToken;
      this.oauth2Client.setCredentials(tokens);
      this.isAuthenticated = true;
    } else {
      this.isAuthenticated = false;
    }

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Set OAuth2 credentials for the service
   * @param {Object} tokens - Object containing access_token and optional refresh_token
   */
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
    this.isAuthenticated = !!tokens.access_token;
  }

  /**
   * Генерирует URL для OAuth авторизации Google
   * @param {Object} options - Дополнительные параметры авторизации
   * @returns {string} URL для авторизации
   */
  getAuthUrl(options = {}) {
    try {
      const defaultScopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify'
      ];

      const {
        scopes = defaultScopes,
        state = null,
        prompt = 'consent'
      } = options;

      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: state,
        prompt: prompt,
        include_granted_scopes: true
      });

      console.log('✅ Generated Gmail OAuth URL');
      return authUrl;
    } catch (error) {
      console.error('Failed to generate Gmail OAuth URL:', error);
      throw new Error('Failed to generate authorization URL');
    }
  }

  /**
   * Обменивает код авторизации на токены доступа
   * @param {string} code - Код авторизации из OAuth потока
   * @returns {Object} Объект с токенами (access_token, refresh_token, etc.)
   */
  async getTokens(code) {
    try {
      if (!code) {
        throw new Error('Authorization code is required');
      }

      console.log('🔄 Exchanging authorization code for tokens...');
      
      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        throw new Error('Failed to obtain access token from authorization code');
      }

      // Устанавливаем полученные токены
      this.setCredentials(tokens);
      
      console.log('✅ Successfully obtained Gmail tokens');
      
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        token_type: tokens.token_type,
        expiry_date: tokens.expiry_date
      };
    } catch (error) {
      console.error('Gmail OAuth token exchange failed:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Get list of emails with optional query filters
   * @param {Object} options - Query options
   * @returns {Object} Email list response
   */
  async getEmails(options = {}) {
    try {
      const {
        query = '',
        maxResults = 10,
        pageToken,
        labelIds = ['INBOX']
      } = options;

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
        pageToken,
        labelIds,
      });

      return {
        messages: response.data.messages || [],
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate
      };
    } catch (error) {
      console.error('Failed to fetch emails from Gmail:', error);
      throw new Error('Failed to fetch emails');
    }
  }

  /**
   * Получает подробную информацию о письме по ID
   * @param {string} messageId - ID сообщения Gmail
   * @returns {Object} Детальная информация о письме
   */
  async getEmailDetails(messageId) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Gmail service is not authenticated. Please call getTokens() first.');
      }

      if (!messageId) {
        throw new Error('Message ID is required to fetch email details');
      }

      console.log(`📧 Fetching email details for message: ${messageId}`);

      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      const headers = message.payload.headers || [];

      // Извлекаем заголовки письма
      const getHeader = (name) => 
        headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      // Используем приватный метод для извлечения тела письма
      const emailBody = this._extractEmailBody(message.payload);

      // Определяем тип письма и дополнительные метаданные
      const emailDetails = {
        id: message.id,
        threadId: message.threadId,
        subject: getHeader('Subject') || 'No Subject',
        from: getHeader('From'),
        to: getHeader('To'),
        cc: getHeader('Cc'),
        bcc: getHeader('Bcc'),
        replyTo: getHeader('Reply-To'),
        date: getHeader('Date'),
        body: emailBody.text || '',
        htmlBody: emailBody.html || '',
        snippet: message.snippet || '',
        labelIds: message.labelIds || [],
        internalDate: message.internalDate,
        sizeEstimate: message.sizeEstimate || 0,
        historyId: message.historyId,
        
        // Дополнительные метаданные
        metadata: {
          hasAttachments: this._hasAttachments(message.payload),
          isUnread: (message.labelIds || []).includes('UNREAD'),
          isImportant: (message.labelIds || []).includes('IMPORTANT'),
          messageId: getHeader('Message-ID'),
          references: getHeader('References'),
          inReplyTo: getHeader('In-Reply-To')
        },

        // Информация о вложениях
        attachments: this._getAttachmentInfo(message.payload)
      };

      console.log(`✅ Successfully fetched email details for ${messageId}`);
      return emailDetails;

    } catch (error) {
      console.error(`Failed to fetch email details for ${messageId}:`, error);
      throw new Error(`Failed to fetch email details for message ${messageId}`);
    }
  }

  /**
   * Get detailed email content by ID (Legacy method for backward compatibility)
   * @param {string} messageId - Gmail message ID
   * @returns {Object} Detailed email object
   */
  async getEmail(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      const headers = message.payload.headers || [];

      // Extract common headers
      const getHeader = (name) => 
        headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      // Extract email body
      const extractBody = (payload) => {
        if (payload.body && payload.body.data) {
          return Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }
        
        if (payload.parts) {
          // Look for plain text first
          for (const part of payload.parts) {
            if (part.mimeType === 'text/plain' && part.body && part.body.data) {
              return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
          }
          
          // Fallback to HTML if no plain text
          for (const part of payload.parts) {
            if (part.mimeType === 'text/html' && part.body && part.body.data) {
              return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
          }

          // Recursive search in nested parts
          for (const part of payload.parts) {
            if (part.parts) {
              const nestedBody = extractBody(part);
              if (nestedBody) return nestedBody;
            }
          }
        }
        
        return '';
      };

      return {
        id: message.id,
        threadId: message.threadId,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        to: getHeader('To'),
        date: getHeader('Date'),
        body: extractBody(message.payload),
        snippet: message.snippet,
        labelIds: message.labelIds || [],
        internalDate: message.internalDate
      };
    } catch (error) {
      console.error(`Failed to fetch email ${messageId} from Gmail:`, error);
      throw new Error(`Failed to fetch email with ID ${messageId}`);
    }
  }

  /**
   * Send an email
   * @param {Object} options - Email options
   * @returns {Object} Sent email response
   */
  async sendEmail(options) {
    try {
      const { to, subject, body, cc, bcc, replyTo, threadId } = options;

      if (!to || !subject || !body) {
        throw new Error('Missing required email fields: to, subject, and body are required');
      }

      const email = [
        `To: ${to}`,
        cc ? `Cc: ${cc}` : '',
        bcc ? `Bcc: ${bcc}` : '',
        replyTo ? `Reply-To: ${replyTo}` : '',
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body
      ].filter(line => line !== '').join('\n');

      const encodedEmail = Buffer.from(email).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const requestBody = {
        raw: encodedEmail
      };

      if (threadId) {
        requestBody.threadId = threadId;
      }

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody
      });

      return {
        id: response.data.id,
        threadId: response.data.threadId
      };
    } catch (error) {
      console.error('Failed to send email via Gmail:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Mark email as read/unread
   * @param {string} messageId - Gmail message ID
   * @param {boolean} read - Whether to mark as read (true) or unread (false)
   * @returns {Object} Success response
   */
  async markAsRead(messageId, read = true) {
    try {
      const requestBody = {};
      
      if (read) {
        requestBody.removeLabelIds = ['UNREAD'];
      } else {
        requestBody.addLabelIds = ['UNREAD'];
      }

      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody
      });

      return { success: true };
    } catch (error) {
      console.error(`Failed to mark email ${messageId} as ${read ? 'read' : 'unread'}:`, error);
      throw new Error(`Failed to mark email as ${read ? 'read' : 'unread'}`);
    }
  }

  /**
   * Add or remove labels from an email
   * @param {string} messageId - Gmail message ID
   * @param {Object} options - Label modification options
   * @returns {Object} Success response
   */
  async modifyLabels(messageId, options) {
    try {
      const { addLabelIds = [], removeLabelIds = [] } = options;

      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds,
          removeLabelIds
        }
      });

      return { success: true };
    } catch (error) {
      console.error(`Failed to modify labels for email ${messageId}:`, error);
      throw new Error('Failed to modify email labels');
    }
  }

  /**
   * Get user's Gmail profile information
   * @returns {Object} Profile information
   */
  async getProfile() {
    try {
      const response = await this.gmail.users.getProfile({
        userId: 'me'
      });

      return {
        emailAddress: response.data.emailAddress,
        messagesTotal: response.data.messagesTotal,
        threadsTotal: response.data.threadsTotal,
        historyId: response.data.historyId
      };
    } catch (error) {
      console.error('Failed to fetch Gmail profile:', error);
      throw new Error('Failed to fetch Gmail profile');
    }
  }

  /**
   * Поиск писем по ключевым словам
   * @param {string|Array} keywords - Ключевые слова для поиска (строка или массив строк)
   * @param {Object} options - Опции поиска
   * @returns {Object} Результаты поиска с детальной информацией о письмах
   */
  async searchEmails(keywords, options = {}) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Gmail service is not authenticated. Please call getTokens() first.');
      }

      if (!keywords) {
        throw new Error('Keywords parameter is required for email search');
      }

      const {
        maxResults = 20,
        includeSpamTrash = false,
        dateRange = null, // Например: 'newer_than:7d'
        hasAttachment = null,
        isUnread = null,
        folder = 'INBOX'
      } = options;

      // Формируем поисковый запрос
      let searchQuery = '';
      
      if (Array.isArray(keywords)) {
        // Если передан массив ключевых слов, объединяем их через OR
        searchQuery = keywords.map(keyword => `"${keyword}"`).join(' OR ');
      } else {
        // Если передана строка, используем её как есть
        searchQuery = `"${keywords}"`;
      }

      // Добавляем дополнительные фильтры
      const filters = [];
      
      if (!includeSpamTrash) {
        filters.push('-in:spam', '-in:trash');
      }
      
      if (dateRange) {
        filters.push(dateRange);
      }
      
      if (hasAttachment !== null) {
        filters.push(hasAttachment ? 'has:attachment' : '-has:attachment');
      }
      
      if (isUnread !== null) {
        filters.push(isUnread ? 'is:unread' : '-is:unread');
      }

      if (folder && folder !== 'ALL') {
        filters.push(`in:${folder.toLowerCase()}`);
      }

      // Объединяем основной запрос с фильтрами
      const finalQuery = [searchQuery, ...filters].join(' ');

      console.log(`🔍 Searching emails with query: "${finalQuery}"`);

      const emails = await this.getEmails({
        query: finalQuery,
        maxResults
      });

      if (!emails.messages || emails.messages.length === 0) {
        console.log('📭 No emails found matching the search criteria');
        return {
          emails: [],
          totalFound: 0,
          searchQuery: finalQuery,
          nextPageToken: null
        };
      }

      console.log(`📧 Found ${emails.messages.length} emails, fetching details...`);

      // Получаем детальную информацию для каждого письма
      const detailedEmails = await Promise.all(
        emails.messages.map(async (message) => {
          try {
            return await this.getEmailDetails(message.id);
          } catch (error) {
            console.warn(`⚠️ Failed to fetch details for email ${message.id}:`, error.message);
            return null;
          }
        })
      );

      const validEmails = detailedEmails.filter(email => email !== null);

      console.log(`✅ Successfully retrieved ${validEmails.length} detailed emails`);

      return {
        emails: validEmails,
        totalFound: validEmails.length,
        searchQuery: finalQuery,
        nextPageToken: emails.nextPageToken,
        totalResults: emails.resultSizeEstimate
      };
    } catch (error) {
      const keywordsStr = Array.isArray(keywords) ? keywords.join(', ') : keywords;
      console.error(`Failed to search emails with keywords: ${keywordsStr}:`, error);
      throw new Error('Failed to search emails');
    }
  }

  /**
   * Extract feedback from email content
   * @param {Object} email - Email object
   * @returns {Object} Formatted feedback object
   */
  extractFeedbackFromEmail(email) {
    return {
      title: email.subject || 'No Subject',
      content: email.body || email.snippet || '',
      source: 'gmail',
      metadata: {
        emailId: email.id,
        threadId: email.threadId,
        sender: email.from,
        date: email.date,
        internalDate: email.internalDate
      },
      tags: ['email', 'gmail'],
      priority: this.determinePriority(email),
      category: this.categorizeEmail(email)
    };
  }

  /**
   * Determine email priority based on content and headers
   * @param {Object} email - Email object
   * @returns {string} Priority level (low, medium, high)
   */
  determinePriority(email) {
    const subject = (email.subject || '').toLowerCase();
    const body = (email.body || email.snippet || '').toLowerCase();
    
    const urgentKeywords = ['urgent', 'critical', 'emergency', 'asap', 'immediate'];
    const highKeywords = ['important', 'bug', 'error', 'issue', 'problem'];
    
    if (urgentKeywords.some(keyword => subject.includes(keyword) || body.includes(keyword))) {
      return 'high';
    }
    
    if (highKeywords.some(keyword => subject.includes(keyword) || body.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Categorize email based on content
   * @param {Object} email - Email object
   * @returns {string} Email category
   */
  categorizeEmail(email) {
    const subject = (email.subject || '').toLowerCase();
    const body = (email.body || email.snippet || '').toLowerCase();
    const content = `${subject} ${body}`;
    
    if (content.includes('bug') || content.includes('error') || content.includes('issue')) {
      return 'bug';
    }
    
    if (content.includes('feature') || content.includes('enhancement') || content.includes('improve')) {
      return 'feature';
    }
    
    if (content.includes('question') || content.includes('help') || content.includes('support')) {
      return 'support';
    }
    
    return 'general';
  }

  /**
   * Приватный метод для извлечения текста из тела письма
   * @param {Object} payload - Полезная нагрузка письма из Gmail API
   * @returns {Object} Объект с текстовым и HTML содержимым
   * @private
   */
  _extractEmailBody(payload) {
    const result = {
      text: '',
      html: ''
    };

    try {
      // Если тело письма находится непосредственно в payload
      if (payload.body && payload.body.data) {
        const content = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        
        if (payload.mimeType === 'text/plain') {
          result.text = content;
        } else if (payload.mimeType === 'text/html') {
          result.html = content;
        } else {
          result.text = content; // Fallback
        }
        
        return result;
      }

      // Если письмо имеет части (multipart)
      if (payload.parts && payload.parts.length > 0) {
        this._extractFromParts(payload.parts, result);
      }

      // Если ничего не найдено, попробуем извлечь из snippet
      if (!result.text && !result.html && payload.snippet) {
        result.text = payload.snippet;
      }

      return result;
    } catch (error) {
      console.warn('⚠️ Error extracting email body:', error.message);
      return {
        text: payload.snippet || '',
        html: ''
      };
    }
  }

  /**
   * Рекурсивно извлекает содержимое из частей письма
   * @param {Array} parts - Массив частей письма
   * @param {Object} result - Объект для сохранения результата
   * @private
   */
  _extractFromParts(parts, result) {
    for (const part of parts) {
      // Если часть содержит вложенные части, обрабатываем рекурсивно
      if (part.parts && part.parts.length > 0) {
        this._extractFromParts(part.parts, result);
        continue;
      }

      // Извлекаем содержимое из текущей части
      if (part.body && part.body.data) {
        const content = Buffer.from(part.body.data, 'base64').toString('utf-8');
        
        if (part.mimeType === 'text/plain' && !result.text) {
          result.text = content;
        } else if (part.mimeType === 'text/html' && !result.html) {
          result.html = content;
        }
      }
    }
  }

  /**
   * Проверяет наличие вложений в письме
   * @param {Object} payload - Полезная нагрузка письма
   * @returns {boolean} true если есть вложения
   * @private
   */
  _hasAttachments(payload) {
    if (payload.parts) {
      return payload.parts.some(part => 
        part.filename && part.filename.length > 0 ||
        (part.headers && part.headers.some(h => 
          h.name.toLowerCase() === 'content-disposition' && 
          h.value.toLowerCase().includes('attachment')
        ))
      );
    }
    return false;
  }

  /**
   * Извлекает информацию о вложениях
   * @param {Object} payload - Полезная нагрузка письма
   * @returns {Array} Массив информации о вложениях
   * @private
   */
  _getAttachmentInfo(payload) {
    const attachments = [];
    
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.filename && part.filename.length > 0) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body?.size || 0,
            attachmentId: part.body?.attachmentId
          });
        }
        
        // Рекурсивно проверяем вложенные части
        if (part.parts) {
          attachments.push(...this._getAttachmentInfo(part));
        }
      }
    }
    
    return attachments;
  }

  /**
   * Check if service is properly configured
   * @returns {boolean} Configuration status
   */
  isConfigured() {
    return !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Проверяет статус аутентификации
   * @returns {boolean} true если сервис аутентифицирован
   */
  checkAuthentication() {
    return this.isAuthenticated && !!this.oauth2Client.credentials?.access_token;
  }

  /**
   * Получает статистику работы сервиса
   * @returns {Object} Статистика сервиса
   */
  getStats() {
    return {
      isConfigured: this.isConfigured(),
      isAuthenticated: this.isAuthenticated,
      hasCredentials: !!this.oauth2Client.credentials?.access_token,
      hasRefreshToken: !!this.oauth2Client.credentials?.refresh_token,
      tokenExpiry: this.oauth2Client.credentials?.expiry_date || null
    };
  }
}

// Create and export a singleton instance
const gmailService = new GmailService();

module.exports = {
  GmailService,
  gmailService
};