import { JsonCleaner } from '../jsonCleaner';

describe('JsonCleaner', () => {
  const testCases = [
    {
      name: 'Repeating characters test',
      input: `[{"title":"Create Task with Maximum Title Length","area":"Task Management","description":"Verify that the system accepts a task title up to the maximum allowed length.","preconditions":["User is logged in","User navigates to Task Management module"],"testData":["title: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA","description: Max length title test.","due date: 2024-07-01","priority: Medium"],"steps":[{"number":1,"description":"Navigate to the Task Management module."}],"expectedResult":"Task is created successfully with the 255-character title."}]`,
      expectSuccess: true,
      validate: (result: string) => {
        const parsed = JSON.parse(result);
        expect(parsed[0].testData[0]).toContain('A'.repeat(255));
      }
    },
    {
      name: 'Email concatenation test',
      input: `[{"title":"Boundary Condition: Maximum Allowed Email Length","area":"Registration","description":"Verify that the system accepts emails with maximum allowed length.","preconditions":["No existing user with the test email"],"testData":["email: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@example.com","password: Boundary1"],"steps":[{"number":1,"description":"Navigate to the registration page."}],"expectedResult":"Registration succeeds with maximum length email."}]`,
      expectSuccess: true,
      validate: (result: string) => {
        const parsed = JSON.parse(result);
        expect(parsed[0].testData[0]).toContain('@example.com');
      }
    },
    {
      name: 'Special characters test',
      input: `[{"title":"Test with Special Characters","area":"Task Management","description":"Test special characters handling","testData":["title: Task with special chars: !@#$%^&*()_+-=","description: Testing special chars"],"steps":[{"number":1,"description":"Enter special characters"}],"expectedResult":"Task created with special characters"}]`,
      expectSuccess: true,
      validate: (result: string) => {
        const parsed = JSON.parse(result);
        expect(parsed[0].testData[0]).toContain('!@#$%^&*()_+-=');
      }
    },
    {
      name: 'Unescaped backslash test',
      input: `[{"title":"Test with Unescaped Backslashes","area":"Input Validation","description":"Test backslash handling","testData":["path: C:\\\\Program Files\\\\App","regex: \\\\w+\\\\s+\\\\d+"],"steps":[{"number":1,"description":"Enter path with backslashes"}],"expectedResult":"Path accepted"}]`,
      expectSuccess: true,
      validate: (result: string) => {
        const parsed = JSON.parse(result);
        expect(parsed[0].testData[0]).toContain('C:\\Program Files\\App');
      }
    },
    {
      name: 'Nested quotes test',
      input: `[{"title":"Test with Nested Quotes","area":"Validation","description":"Test nested quote handling","testData":["input: \\"quoted text\\"","description: 'single quoted'"],"steps":[{"number":1,"description":"Enter quoted text"}],"expectedResult":"Text with quotes accepted"}]`,
      expectSuccess: true,
      validate: (result: string) => {
        const parsed = JSON.parse(result);
        expect(parsed[0].testData[0]).toContain('"quoted text"');
      }
    },
    {
      name: 'Complex string literals test',
      input: `[{"title":"Test with Complex Characters","area":"String Handling","description":"Test complex string literal handling","testData":["path: C:\\\\Complex\\\\Path\\\\Here","input: Task with !@#$%^&*()_+-=\`~[]\\\\{}|;':\\",./<>? chars","regex: \\\\w+\\\\s+\\\\d+"],"steps":[{"number":1,"description":"Enter 'C:\\\\Program Files\\\\App' in path"}],"expectedResult":"All characters handled correctly"}]`,
      expectSuccess: true,
      validate: (result: string) => {
        const parsed = JSON.parse(result);
        expect(parsed[0].testData[1]).toContain('!@#$%^&*()_+-=');
      }
    },
    {
      name: 'Invalid JSON test',
      input: `{"invalid": "json"`,
      expectSuccess: false,
      errorMessage: 'Response does not contain a valid JSON array'
    },
    {
      name: 'Markdown code block test',
      input: '```json\n[{"test": "value"}]\n```',
      expectSuccess: true,
      validate: (result: string) => {
        const parsed = JSON.parse(result);
        expect(parsed[0].test).toBe('value');
      }
    }
  ];

  describe('cleanJsonResponse', () => {
    testCases.forEach(testCase => {
      it(testCase.name, () => {
        if (testCase.expectSuccess) {
          const result = JsonCleaner.cleanJsonResponse(testCase.input);
          expect(() => JSON.parse(result)).not.toThrow();
          testCase.validate?.(result);
        } else {
          expect(() => JsonCleaner.cleanJsonResponse(testCase.input))
            .toThrow(testCase.errorMessage);
        }
      });
    });
  });

  describe('cleanJsonString', () => {
    it('handles escaped characters correctly', () => {
      const input = '"test\\nwith\\tescape\\\\sequences"';
      const result = JsonCleaner.cleanJsonString(input);
      expect(result).toBe('"test\\nwith\\tescape\\\\sequences"');
    });

    it('removes control characters', () => {
      const input = '"test\u0000with\u0001control\u0002chars"';
      const result = JsonCleaner.cleanJsonString(input);
      expect(result).not.toMatch(/[\u0000-\u001F]/);
    });
  });
}); 