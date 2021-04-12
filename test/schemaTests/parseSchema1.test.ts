import verify from '../../src/yamlVerifier';
import ScraperSchema from "../../src/common/elements";

describe("schema2.yaml 파싱 테스트", () => {
    let parsed: ScraperSchema;
    test('verify 테스트', () => {
        parsed = verify('test/schemaTests/schema1.yaml')
    });

    test("type 체크", () => {
        expect(parsed.elements.title.type).toBe('String');
    });

    test("inherit이 의도한 대로 동작하는지", () => {
        expect(parsed.elements.sub_title.type).toBe('String');
        expect(parsed.elements.sub_title.isArray).toBe(false);
        expect(parsed.elements.sub_title.isRequired).toBe(true);
    });

    test("collect 배열 파싱", () => {
        expect(parsed.collect.main).toEqual(['title', 'sub_title', 'writer', 'date']);
        expect(parsed.collect.sub).toEqual([
            'content', 'content_html', 'files',
            'video_link', 'url', 'site_name'
        ]);
    });
});
