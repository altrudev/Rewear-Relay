use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

pub const MAX_CANDIDATES: usize = 30;

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct SourceItem {
    pub id: String,
    pub title: String,
    pub price: Option<f64>,
    pub currency: Option<String>,
    pub garment_category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct Candidate {
    pub id: String,
    pub title: String,
    pub price: Option<f64>,
    pub currency: Option<String>,
    pub source: String,
    pub observed_at: String,
    pub garment_category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct RelayRequest {
    pub source: SourceItem,
    pub candidates: Vec<Candidate>,
    pub intent: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct RankedCandidate {
    pub candidate_id: String,
    pub score: u8,
    pub reasons: Vec<String>,
    pub cautions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct RelayPlan {
    pub source_item_id: String,
    pub ranked: Vec<RankedCandidate>,
    pub summary: String,
}

#[derive(Debug, thiserror::Error)]
pub enum ContractError {
    #[error("candidate set is empty")]
    EmptyCandidates,
    #[error("candidate set exceeds maximum of {MAX_CANDIDATES}")]
    TooManyCandidates,
    #[error("candidate ids must be unique")]
    DuplicateCandidateId,
    #[error("relay plan source id does not match request source")]
    SourceMismatch,
    #[error("relay plan contains an unknown candidate id: {0}")]
    UnknownCandidate(String),
    #[error("relay plan contains duplicate candidate id: {0}")]
    DuplicateRankedCandidate(String),
    #[error("relay score must be between 0 and 100")]
    InvalidScore,
}

pub fn validate_request(request: &RelayRequest) -> Result<(), ContractError> {
    if request.candidates.is_empty() {
        return Err(ContractError::EmptyCandidates);
    }
    if request.candidates.len() > MAX_CANDIDATES {
        return Err(ContractError::TooManyCandidates);
    }

    let mut ids = HashSet::new();
    for candidate in &request.candidates {
        if !ids.insert(candidate.id.as_str()) {
            return Err(ContractError::DuplicateCandidateId);
        }
    }
    Ok(())
}

pub fn validate_plan(request: &RelayRequest, plan: &RelayPlan) -> Result<(), ContractError> {
    if plan.source_item_id != request.source.id {
        return Err(ContractError::SourceMismatch);
    }

    let allowed: HashSet<&str> = request.candidates.iter().map(|c| c.id.as_str()).collect();
    let mut seen = HashSet::new();

    for ranked in &plan.ranked {
        if ranked.score > 100 {
            return Err(ContractError::InvalidScore);
        }
        if !allowed.contains(ranked.candidate_id.as_str()) {
            return Err(ContractError::UnknownCandidate(ranked.candidate_id.clone()));
        }
        if !seen.insert(ranked.candidate_id.as_str()) {
            return Err(ContractError::DuplicateRankedCandidate(ranked.candidate_id.clone()));
        }
    }

    Ok(())
}

pub fn build_prompt(request: &RelayRequest) -> anyhow::Result<String> {
    validate_request(request)?;
    let payload = serde_json::to_string(request)?;

    Ok(format!(
        "Rank only the supplied secondhand-fashion candidates against the source item and shopper intent.\n\
         Rules:\n\
         - Never invent a candidate, merchant, price, availability claim, URL, measurement, or garment detail.\n\
         - Use candidate_id values exactly as supplied.\n\
         - Do not claim physical fit, sizing certainty, authenticity, safety, or product condition beyond supplied evidence.\n\
         - Treat observed_at as evidence only that the candidate was observed at that time, not that it remains available now.\n\
         - Prefer a smaller ranked set over weak recommendations.\n\
         - score is 0-100 and represents recommendation confidence, not physical-fit probability.\n\
         - Include cautions whenever evidence is incomplete.\n\
         Return a typed RelayPlan only.\n\nINPUT:\n{payload}"
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request() -> RelayRequest {
        RelayRequest {
            source: SourceItem {
                id: "source-1".into(),
                title: "Brown leather jacket".into(),
                price: Some(80.0),
                currency: Some("USD".into()),
                garment_category: Some("outerwear".into()),
            },
            candidates: vec![Candidate {
                id: "candidate-1".into(),
                title: "Vintage brown leather jacket".into(),
                price: Some(72.0),
                currency: Some("USD".into()),
                source: "marketplace".into(),
                observed_at: "2026-08-25T20:00:00Z".into(),
                garment_category: Some("outerwear".into()),
            }],
            intent: Some("similar look under $90".into()),
        }
    }

    #[test]
    fn rejects_invented_candidate_id() {
        let req = request();
        let plan = RelayPlan {
            source_item_id: req.source.id.clone(),
            ranked: vec![RankedCandidate {
                candidate_id: "invented".into(),
                score: 90,
                reasons: vec!["looks similar".into()],
                cautions: vec![],
            }],
            summary: "test".into(),
        };
        assert!(matches!(validate_plan(&req, &plan), Err(ContractError::UnknownCandidate(_))));
    }

    #[test]
    fn rejects_source_mismatch() {
        let req = request();
        let plan = RelayPlan {
            source_item_id: "wrong-source".into(),
            ranked: vec![],
            summary: "test".into(),
        };
        assert!(matches!(validate_plan(&req, &plan), Err(ContractError::SourceMismatch)));
    }
}
