export interface WhatsAppTemplate {
  name: string;
  category: 'MARKETING' | 'UTILITY';
  language: string;
  header: string;
  footer: string;
  bodyVariations: string[];
}

export const whatsappTemplates: Record<string, WhatsAppTemplate> = {
  greeting: {
    name: 'linker_survey_greeting',
    category: 'MARKETING',
    language: 'ar',
    header: '',
    footer: 'لينكر لذكاء السوق اليمني',
    bodyVariations: [
      'السلام عليكم 👋\n\nمعك فريق شركة لينكر لوجستكس  دراسة تجربة التسوق والتوصيل في اليمن 🙏\n\nحالياً نعمل دراسة بسيطة لفهم تجربة الناس مع التسوق من المواقع والتطبيقات العالمية مثل شي إن ونون وأمازون وغيرها، بهدف تحسين خدمات الشحن والتوصيل والدفع داخل اليمن.\n\nالاستبيان خفيف جداً وما يأخذ أكثر من دقيقتين 🌷\nوإجاباتك بتساعدنا نفهم احتياجات العملاء بشكل أفضل.\n\nهل ممكن نبدأ؟ 😊',
      'أهلين 🌷\n\nمعنا استبيان سريع عن تجربة التسوق الإلكتروني في اليمن 🙏\n\nالهدف إننا نفهم كيف الناس تشتري من النت علشان نحسن خدمات الشحن والتوصيل.\n\nالاستبيان بسيط وما ياخذ دقيقتين فقط.\n\nممكن نبدأ معك؟ 😊',
      'مساء الخير ☀️\n\nفريق لينكر لدراسة السوق اليمني معاك 🙏\n\nعندنا كم سؤال بسيط عن تجربتك مع التسوق من التطبيقات والمواقع العالمية.\n\nشاركنا رأيك في دقيقتين وساعدنا نحسن الخدمة للجميع 🌷',
    ],
  },

  reminder: {
    name: 'linker_survey_reminder',
    category: 'MARKETING',
    language: 'ar',
    header: '',
    footer: 'لينكر لذكاء السوق اليمني',
    bodyVariations: [
      'أهلين 🌷\n\nفقط تذكير بسيط بخصوص الاستبيان 🙏\nباقي لك أقل من دقيقتين ويكتمل 👍\n\nمشاركتك تساعدنا نفهم احتياجات العملاء بشكل أفضل وتحسين خدمات الشحن والتوصيل داخل اليمن.',
      'مرحباً 👋\n\nتذكير سريع — الاستبيان ما زال مفتوح ومحتاجين رأيك 🙏\n\nدقيقتين فقط وتكون خلصت 🌷',
    ],
  },

  reactivation: {
    name: 'linker_survey_reactivation',
    category: 'MARKETING',
    language: 'ar',
    header: '',
    footer: 'لينكر لذكاء السوق اليمني',
    bodyVariations: [
      'أهلين 👋\n\nحالياً نعمل تحديث جديد لدراسة التسوق الإلكتروني داخل اليمن، وحابين نأخذ رأيك السريع إذا عندك دقيقة 🌷',
      'مرحباً 🌷\n\nرجعنا بدراسة جديدة عن التسوق الإلكتروني في اليمن، وإذا تقدر تشاركنا رأيك في دقيقة وحدة نكون شاكرين 🙏',
    ],
  },

  completed: {
    name: 'linker_survey_completed',
    category: 'UTILITY',
    language: 'ar',
    header: '',
    footer: 'لينكر لذكاء السوق اليمني',
    bodyVariations: [
      'شكراً لك جداً 🙏🌷\n\nمشاركتك أفادتنا بشكل كبير، وبإذن الله تساعد في تحسين خدمات التسوق والتوصيل داخل اليمن.\n\nنتمنى لك يوم سعيد 💜',
    ],
  },
};

export function getTemplateVariation(templateKey: keyof typeof whatsappTemplates): string {
  const template = whatsappTemplates[templateKey];
  const variations = template.bodyVariations;
  return variations[Math.floor(Math.random() * variations.length)];
}

export function getBestTemplateForPhase(phase: 'initial' | 'reminder' | 'reactivation' | 'completed'): string {
  const map: Record<string, keyof typeof whatsappTemplates> = {
    initial: 'greeting',
    reminder: 'reminder',
    reactivation: 'reactivation',
    completed: 'completed',
  };
  return getTemplateVariation(map[phase]);
}
