/**
 * Environment Variables Validator
 * Validates required ENV vars at startup
 */

interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

const REQUIRED_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
];

const OPTIONAL_VARS = [
  'VITE_STRIPE_PRICE_VIP_MONTH_ID',
  'VITE_STRIPE_PRICE_VIP_YEAR_ID',
  'VITE_ONESIGNAL_APP_ID',
];

export function validateEnvironment(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  REQUIRED_VARS.forEach(varName => {
    if (!import.meta.env[varName]) {
      missing.push(varName);
    }
  });

  // Check optional variables
  OPTIONAL_VARS.forEach(varName => {
    if (!import.meta.env[varName]) {
      warnings.push(varName);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

export function renderEnvErrorScreen(result: EnvValidationResult, language: 'en' | 'es' | 'de' = 'en') {
  const messages = {
    en: {
      title: '⚠️ Configuration Error',
      subtitle: 'Missing required environment variables',
      missing: 'Missing Required:',
      warnings: 'Missing Optional:',
      instructions: 'Please configure the following variables in your .env file:',
      footer: 'See ENV_CONFIGURATION.md for setup instructions',
    },
    es: {
      title: '⚠️ Error de Configuración',
      subtitle: 'Faltan variables de entorno requeridas',
      missing: 'Requeridas Faltantes:',
      warnings: 'Opcionales Faltantes:',
      instructions: 'Por favor configura las siguientes variables en tu archivo .env:',
      footer: 'Ver ENV_CONFIGURATION.md para instrucciones',
    },
    de: {
      title: '⚠️ Konfigurationsfehler',
      subtitle: 'Erforderliche Umgebungsvariablen fehlen',
      missing: 'Erforderlich Fehlend:',
      warnings: 'Optional Fehlend:',
      instructions: 'Bitte konfigurieren Sie folgende Variablen in Ihrer .env Datei:',
      footer: 'Siehe ENV_CONFIGURATION.md für Anweisungen',
    },
  };

  const t = messages[language];

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: system-ui, -apple-system, sans-serif;
    padding: 20px;
  `;

  const content = `
    <div style="
      background: white;
      border-radius: 16px;
      padding: 40px;
      max-width: 600px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      color: #1f2937;
    ">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 32px; margin: 0 0 10px 0; color: #dc2626;">${t.title}</h1>
        <p style="font-size: 16px; color: #6b7280; margin: 0;">${t.subtitle}</p>
      </div>

      ${result.missing.length > 0 ? `
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
          <strong style="color: #dc2626; display: block; margin-bottom: 10px;">${t.missing}</strong>
          <ul style="margin: 0; padding-left: 20px; color: #991b1b;">
            ${result.missing.map(v => `<li style="margin: 5px 0;"><code style="background: #fee2e2; padding: 2px 6px; border-radius: 4px;">${v}</code></li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${result.warnings.length > 0 ? `
        <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
          <strong style="color: #d97706; display: block; margin-bottom: 10px;">${t.warnings}</strong>
          <ul style="margin: 0; padding-left: 20px; color: #92400e;">
            ${result.warnings.map(v => `<li style="margin: 5px 0;"><code style="background: #fef3c7; padding: 2px 6px; border-radius: 4px;">${v}</code></li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 10px 0; color: #374151; font-weight: 500;">${t.instructions}</p>
        <pre style="
          background: #1f2937;
          color: #10b981;
          padding: 15px;
          border-radius: 6px;
          overflow-x: auto;
          font-size: 14px;
          margin: 0;
        ">${result.missing.map(v => `${v}="your_value_here"`).join('\n')}</pre>
      </div>

      <p style="text-align: center; margin: 20px 0 0 0; font-size: 14px; color: #6b7280;">
        📖 ${t.footer}
      </p>
    </div>
  `;

  overlay.innerHTML = content;
  document.body.appendChild(overlay);
}
