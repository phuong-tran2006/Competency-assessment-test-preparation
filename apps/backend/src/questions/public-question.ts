/** Public practice APIs expose prompts and choices. Solutions come from submitted attempts. */
export function publicQuestion(question: any) {
  const { explanation: _explanation, options, ...rest } = question;
  return {
    ...rest,
    ...(Array.isArray(options) ? {
      options: options.map(({ id, content, order }) => ({ id, content, order })),
    } : {}),
  };
}
