interface MessageTemplate {
  name: string;
  sid: string;
  language: string;
}

interface MessageTemplates {
  [key: string]: MessageTemplate;
}

const messageTemplates: MessageTemplates = {
  "welcome": {
    name: 'endopolitica_boas_vindas',
    sid: 'HX062974fc92d851c77c65bd26406abd18',
    language: 'br'
  }
};

export default messageTemplates; 