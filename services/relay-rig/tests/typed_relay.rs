use rewear_relay_rig::{build_prompt, validate_plan, Candidate, RelayPlan, RelayRequest, SourceItem};
use rig::{agent::AgentBuilder, completion::TypedPrompt, test_utils::MockCompletionModel};

fn request() -> RelayRequest {
    RelayRequest {
        source: SourceItem {
            id: "source-1".into(),
            title: "Brown leather jacket".into(),
            price: Some(80.0),
            currency: Some("USD".into()),
            garment_category: Some("outerwear".into()),
        },
        candidates: vec![
            Candidate {
                id: "candidate-1".into(),
                title: "Vintage brown leather moto jacket".into(),
                price: Some(72.0),
                currency: Some("USD".into()),
                source: "fixture-marketplace-a".into(),
                observed_at: "2026-08-25T20:00:00Z".into(),
                garment_category: Some("outerwear".into()),
            },
            Candidate {
                id: "candidate-2".into(),
                title: "Black cropped denim jacket".into(),
                price: Some(45.0),
                currency: Some("USD".into()),
                source: "fixture-marketplace-b".into(),
                observed_at: "2026-08-25T20:01:00Z".into(),
                garment_category: Some("outerwear".into()),
            },
        ],
        intent: Some("similar brown leather look under $90".into()),
    }
}

#[tokio::test]
async fn rig_typed_prompt_accepts_evidence_bounded_plan() {
    let expected = RelayPlan {
        source_item_id: "source-1".into(),
        ranked: vec![rewear_relay_rig::RankedCandidate {
            candidate_id: "candidate-1".into(),
            score: 92,
            reasons: vec!["same garment category".into(), "within stated budget".into()],
            cautions: vec!["availability is only known at observed_at".into()],
        }],
        summary: "Candidate 1 is the strongest supplied alternative.".into(),
    };

    let model = MockCompletionModel::text(serde_json::to_string(&expected).unwrap());
    let model_probe = model.clone();
    let agent = AgentBuilder::new(model).build();
    let prompt = build_prompt(&request()).unwrap();

    let actual: RelayPlan = agent.prompt_typed(prompt).await.unwrap();
    validate_plan(&request(), &actual).unwrap();

    assert_eq!(actual.source_item_id, expected.source_item_id);
    assert_eq!(actual.ranked[0].candidate_id, "candidate-1");
    assert_eq!(model_probe.request_count(), 1);
}

#[tokio::test]
async fn rig_output_is_still_rejected_after_typed_deserialization_if_identity_changes() {
    let malicious_but_well_typed = RelayPlan {
        source_item_id: "source-1".into(),
        ranked: vec![rewear_relay_rig::RankedCandidate {
            candidate_id: "not-supplied".into(),
            score: 99,
            reasons: vec!["invented recommendation".into()],
            cautions: vec![],
        }],
        summary: "This object matches the schema but violates candidate closure.".into(),
    };

    let model = MockCompletionModel::text(serde_json::to_string(&malicious_but_well_typed).unwrap());
    let agent = AgentBuilder::new(model).build();
    let req = request();
    let actual: RelayPlan = agent.prompt_typed(build_prompt(&req).unwrap()).await.unwrap();

    assert!(validate_plan(&req, &actual).is_err());
}
